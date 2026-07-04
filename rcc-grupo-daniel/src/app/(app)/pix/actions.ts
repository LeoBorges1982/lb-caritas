"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { requireRole, auditLog } from "@/lib/session";
import { getPixProvider, generateTxid, confirmPixPayment } from "@/lib/pix";
import { parseMoney } from "@/lib/utils";

// Qualquer usuário ativo pode gerar uma contribuição
export async function createPixCharge(fd: FormData) {
  const user = await requireRole(); // qualquer perfil ativo
  const db = adminClient();

  const amount = parseMoney(fd.get("amount") ? String(fd.get("amount")) : null);
  if (!amount || amount <= 0) throw new Error("Informe um valor maior que zero.");
  const contributionType = String(fd.get("contribution_type") || "oferta");
  const anonymous = fd.get("anonymous") === "on";

  const txid = generateTxid();
  const provider = getPixProvider();
  const charge = await provider.createCharge({
    txid,
    amount,
    description: `Contribuição ${contributionType} — RCC Grupo Daniel`,
  });

  const { error } = await db.from("rcc_pix_payments").insert({
    txid,
    amount,
    contribution_type: contributionType,
    anonymous,
    member_id: anonymous ? null : user.member_id,
    pix_copy_paste: charge.copyPaste,
    external_payment_id: charge.externalPaymentId,
    status: "aguardando",
    expires_at: charge.expiresAt,
  });
  if (error) throw new Error(error.message);

  redirect(`/pix/cobranca/${txid}`);
}

// Baixa manual pelo tesoureiro (sem integração automática)
export async function confirmPixManual(txid: string) {
  const user = await requireRole("admin", "tesoureiro");
  await confirmPixPayment(txid);
  await auditLog(user.id, "confirm_manual", "pix_payment", null, { txid });
  revalidatePath("/pix");
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}

export async function cancelPixCharge(txid: string) {
  const user = await requireRole("admin", "tesoureiro");
  const db = adminClient();
  const { error } = await db
    .from("rcc_pix_payments")
    .update({ status: "cancelado" })
    .eq("txid", txid)
    .eq("status", "aguardando");
  if (error) throw new Error(error.message);
  await auditLog(user.id, "cancel", "pix_payment", null, { txid });
  revalidatePath("/pix");
}
