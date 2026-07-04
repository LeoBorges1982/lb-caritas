"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { requireRole, auditLog } from "@/lib/session";

function get(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  return v === null || v === "" ? null : String(v);
}

function parseMember(fd: FormData) {
  const full_name = get(fd, "full_name");
  if (!full_name) throw new Error("Nome completo é obrigatório.");
  return {
    full_name,
    birth_date: get(fd, "birth_date"),
    phone: get(fd, "phone"),
    whatsapp: get(fd, "whatsapp"),
    email: get(fd, "email"),
    address: get(fd, "address"),
    gender: get(fd, "gender"),
    marital_status: get(fd, "marital_status"),
    ministry: get(fd, "ministry"),
    cell_group: get(fd, "cell_group"),
    role_in_group: get(fd, "role_in_group"),
    joined_at: get(fd, "joined_at"),
    status: get(fd, "status") ?? "ativo",
    notes: get(fd, "notes"),
    accepted_terms: fd.get("accepted_terms") === "on",
  };
}

export async function createMember(fd: FormData) {
  const user = await requireRole("admin");
  const db = adminClient();
  const payload = parseMember(fd);

  // valida duplicidade por e-mail / telefone / nome
  const ors: string[] = [`full_name.eq.${payload.full_name}`];
  if (payload.email) ors.push(`email.eq.${payload.email}`);
  if (payload.phone) ors.push(`phone.eq.${payload.phone}`);
  const { data: dup } = await db.from("rcc_members").select("id").or(ors.join(",")).limit(1);
  if (dup && dup.length > 0) {
    throw new Error("Já existe um membro com este nome, e-mail ou telefone.");
  }

  const { data, error } = await db
    .from("rcc_members")
    .insert({
      ...payload,
      accepted_terms_at: payload.accepted_terms ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await auditLog(user.id, "create", "member", data.id);
  revalidatePath("/membros");
  redirect(`/membros/${data.id}`);
}

export async function updateMember(id: string, fd: FormData) {
  const user = await requireRole("admin");
  const db = adminClient();
  const payload = parseMember(fd);

  const { error } = await db.from("rcc_members").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  await auditLog(user.id, "update", "member", id);
  revalidatePath("/membros");
  revalidatePath(`/membros/${id}`);
  redirect(`/membros/${id}`);
}

// Preferir inativação em vez de exclusão definitiva (LGPD / boas práticas)
export async function toggleMemberStatus(id: string, newStatus: string) {
  const user = await requireRole("admin");
  const db = adminClient();
  const { error } = await db.from("rcc_members").update({ status: newStatus }).eq("id", id);
  if (error) throw new Error(error.message);
  await auditLog(user.id, "status_change", "member", id, { status: newStatus });
  revalidatePath("/membros");
  revalidatePath(`/membros/${id}`);
}

// Importação CSV: full_name;phone;birth_date;email;cell_group;role_in_group;status
export async function importMembersCsv(fd: FormData) {
  const user = await requireRole("admin");
  const file = fd.get("file") as File | null;
  if (!file) throw new Error("Selecione um arquivo CSV.");

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("Arquivo vazio ou sem linhas de dados.");

  const sep = lines[0].includes(";") ? ";" : ",";
  const header = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  if (idx("full_name") === -1 && idx("nome") === -1) {
    throw new Error("Cabeçalho deve conter a coluna full_name (ou nome).");
  }

  const db = adminClient();
  const { data: existing } = await db.from("rcc_members").select("full_name, email, phone");
  const seen = new Set(
    (existing ?? []).flatMap((m) =>
      [m.full_name?.toLowerCase(), m.email?.toLowerCase(), m.phone].filter(Boolean)
    )
  );

  let imported = 0,
    skipped = 0;

  for (const line of lines.slice(1)) {
    const cols = line.split(sep).map((c) => c.trim());
    const val = (name: string, alt?: string) => {
      let i = idx(name);
      if (i === -1 && alt) i = idx(alt);
      return i >= 0 ? cols[i] || null : null;
    };
    const full_name = val("full_name", "nome");
    if (!full_name) continue;

    const email = val("email", "e-mail");
    const phone = val("phone", "telefone");
    if (
      seen.has(full_name.toLowerCase()) ||
      (email && seen.has(email.toLowerCase())) ||
      (phone && seen.has(phone))
    ) {
      skipped++;
      continue;
    }

    // aceita dd/mm/aaaa ou aaaa-mm-dd
    let birth = val("birth_date", "data_nascimento");
    if (birth && /^\d{2}\/\d{2}\/\d{4}$/.test(birth)) {
      const [d, m, y] = birth.split("/");
      birth = `${y}-${m}-${d}`;
    }

    const { error } = await db.from("rcc_members").insert({
      full_name,
      phone,
      email,
      birth_date: birth,
      ministry: val("ministry", "ministerio"),
      cell_group: val("cell_group", "celula"),
      role_in_group: val("role_in_group", "cargo"),
      status: val("status") ?? "ativo",
    });
    if (!error) {
      imported++;
      seen.add(full_name.toLowerCase());
    } else {
      skipped++;
    }
  }

  await auditLog(user.id, "import", "member", null, { imported, skipped });
  revalidatePath("/membros");
  redirect(`/membros?imported=${imported}&skipped=${skipped}`);
}
