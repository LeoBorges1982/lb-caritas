"use server";

import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { requireRole, auditLog, type Role } from "@/lib/session";

// Apenas administrador altera perfil de acesso de outro usuário (regra de negócio)
export async function updateUserAccess(id: string, fd: FormData) {
  const admin = await requireRole("admin");
  const db = adminClient();

  const role = String(fd.get("role") || "membro") as Role;
  const status = String(fd.get("status") || "pendente");
  const memberId = fd.get("member_id") ? String(fd.get("member_id")) : null;
  const ledGroups = String(fd.get("led_groups") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (id === admin.id && role !== "admin") {
    throw new Error("Você não pode remover seu próprio acesso de administrador.");
  }

  const { error } = await db
    .from("rcc_users")
    .update({ role, status, member_id: memberId, led_groups: ledGroups })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await auditLog(admin.id, "update_access", "user", id, { role, status });
  revalidatePath("/usuarios");
}

export async function removeUser(id: string) {
  const admin = await requireRole("admin");
  if (id === admin.id) throw new Error("Você não pode excluir sua própria conta.");
  const db = adminClient();
  // bloqueia em vez de excluir (preserva histórico/auditoria)
  const { error } = await db.from("rcc_users").update({ status: "bloqueado" }).eq("id", id);
  if (error) throw new Error(error.message);
  await auditLog(admin.id, "block", "user", id);
  revalidatePath("/usuarios");
}
