"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { requireRole, auditLog } from "@/lib/session";
import { parseMoney } from "@/lib/utils";

function get(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  return v === null || v === "" ? null : String(v);
}

// Apenas admin e tesoureiro lançam movimentações (regra de negócio)
export async function createTransaction(type: "income" | "expense", fd: FormData) {
  const user = await requireRole("admin", "tesoureiro");
  const db = adminClient();

  const amount = parseMoney(get(fd, "amount"));
  if (!amount || amount <= 0) throw new Error("Informe um valor maior que zero.");
  const date = get(fd, "date");
  if (!date) throw new Error("Data é obrigatória.");
  const category = get(fd, "category");
  if (!category) throw new Error("Categoria é obrigatória.");

  const status = get(fd, "status") ?? (type === "income" ? "confirmado" : "pago");

  const { data, error } = await db
    .from("rcc_financial_transactions")
    .insert({
      type,
      category,
      amount,
      date,
      description: get(fd, "description"),
      payment_method: get(fd, "payment_method"),
      status,
      member_id: get(fd, "member_id"),
      supplier_id: get(fd, "supplier_id"),
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await auditLog(user.id, "create", "financial_transaction", data.id, { type, amount, category });
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  redirect("/financeiro");
}

export async function updateTransactionStatus(id: string, status: string) {
  const user = await requireRole("admin", "tesoureiro");
  const db = adminClient();
  const { error } = await db
    .from("rcc_financial_transactions")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await auditLog(user.id, "status_change", "financial_transaction", id, { status });
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}

// Exclusão de dado estratégico: apenas admin (tesoureiro cancela, não exclui)
export async function deleteTransaction(id: string) {
  const user = await requireRole("admin");
  const db = adminClient();
  const { error } = await db.from("rcc_financial_transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await auditLog(user.id, "delete", "financial_transaction", id);
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}

export async function createSupplier(fd: FormData) {
  const user = await requireRole("admin", "tesoureiro");
  const db = adminClient();
  const name = get(fd, "name");
  if (!name) throw new Error("Nome do fornecedor é obrigatório.");
  const { error } = await db.from("rcc_suppliers").insert({
    name,
    document: get(fd, "document"),
    phone: get(fd, "phone"),
    email: get(fd, "email"),
    description: get(fd, "description"),
  });
  if (error) throw new Error(error.message);
  await auditLog(user.id, "create", "supplier", null, { name });
  revalidatePath("/financeiro/fornecedores");
  redirect("/financeiro/fornecedores");
}
