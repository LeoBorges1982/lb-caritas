import { adminClient } from "@/lib/supabase/admin";

// ============================================================================
// PixPaymentService
// ----------------------------------------------------------------------------
// Camada de serviço para cobranças PIX.
//
// Modo atual ("sandbox"/estático): gera um BR Code EMV válido (copia-e-cola e
// QR Code) apontando para a chave PIX estática do grupo, com txid único. A
// confirmação é manual (tesoureiro dá baixa) ou via webhook simulado.
//
// Integração futura com gateway (Efí, Mercado Pago, PagBank, Asaas...):
// implementar um novo PixProvider com as mesmas assinaturas e trocar via
// env PIX_PROVIDER — o restante do app não muda.
// ============================================================================

export type PixCharge = {
  txid: string;
  copyPaste: string;
  amount: number;
  expiresAt: string;
  externalPaymentId: string | null;
};

export interface PixProvider {
  createCharge(params: { txid: string; amount: number; description: string }): Promise<PixCharge>;
  getChargeStatus(txid: string): Promise<"aguardando" | "confirmado" | "expirado">;
}

// -- BR Code EMV (PIX estático) ----------------------------------------------

function emv(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

// CRC16-CCITT (0xFFFF) — exigido pelo padrão BR Code do Bacen
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function sanitize(s: string, max: number): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .-]/g, "")
    .toUpperCase()
    .slice(0, max)
    .trim();
}

export function buildPixBrCode(params: {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  txid: string;
}): string {
  const { pixKey, merchantName, merchantCity, amount, txid } = params;

  const merchantAccount = emv("26", emv("00", "br.gov.bcb.pix") + emv("01", pixKey));
  const payload =
    emv("00", "01") + // Payload Format Indicator
    merchantAccount +
    emv("52", "0000") + // Merchant Category Code
    emv("53", "986") + // Moeda: BRL
    emv("54", amount.toFixed(2)) +
    emv("58", "BR") +
    emv("59", sanitize(merchantName, 25) || "RCC GRUPO DANIEL") +
    emv("60", sanitize(merchantCity, 15) || "NOVA IGUACU") +
    emv("62", emv("05", txid.slice(0, 25))) +
    "6304"; // CRC placeholder

  return payload + crc16(payload);
}

export function generateTxid(): string {
  // txid alfanumérico até 25 chars (padrão BR Code tag 62-05)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "RCC";
  for (let i = 0; i < 20; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// -- Provider sandbox/estático -------------------------------------------------

async function getPixSettings() {
  const db = adminClient();
  const { data } = await db.from("rcc_settings").select("*").eq("id", 1).single();
  return {
    pixKey: data?.pix_key || process.env.PIX_KEY || "",
    merchantName: data?.pix_merchant_name || process.env.PIX_MERCHANT_NAME || "RCC GRUPO DANIEL",
    merchantCity: data?.pix_merchant_city || process.env.PIX_MERCHANT_CITY || "NOVA IGUACU",
  };
}

const sandboxProvider: PixProvider = {
  async createCharge({ txid, amount }) {
    const cfg = await getPixSettings();
    if (!cfg.pixKey) {
      throw new Error("Chave PIX do grupo não configurada. Peça ao administrador para configurar em Configurações.");
    }
    const copyPaste = buildPixBrCode({
      pixKey: cfg.pixKey,
      merchantName: cfg.merchantName,
      merchantCity: cfg.merchantCity,
      amount,
      txid,
    });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return { txid, copyPaste, amount, expiresAt, externalPaymentId: null };
  },

  async getChargeStatus(txid) {
    const db = adminClient();
    const { data } = await db
      .from("rcc_pix_payments")
      .select("status, expires_at")
      .eq("txid", txid)
      .single();
    if (!data) return "expirado";
    if (data.status === "confirmado") return "confirmado";
    if (data.expires_at && new Date(data.expires_at) < new Date()) return "expirado";
    return "aguardando";
  },
};

export function getPixProvider(): PixProvider {
  // Futuro: switch (process.env.PIX_PROVIDER) { case "efi": return efiProvider; ... }
  return sandboxProvider;
}

// -- Confirmação (webhook ou baixa manual) -------------------------------------
// Confirma o pagamento e gera/atualiza automaticamente a receita correspondente.
export async function confirmPixPayment(txid: string, opts?: { externalPaymentId?: string }) {
  const db = adminClient();
  const { data: pix } = await db.from("rcc_pix_payments").select("*").eq("txid", txid).single();
  if (!pix) throw new Error(`Cobrança PIX não encontrada: ${txid}`);
  if (pix.status === "confirmado") return pix; // idempotente

  // Receita confirmada vinculada ao pagamento
  const { data: tx, error: txError } = await db
    .from("rcc_financial_transactions")
    .insert({
      type: "income",
      category: pix.contribution_type === "doacao" ? "doacao" : pix.contribution_type,
      amount: pix.amount,
      date: new Date().toISOString().slice(0, 10),
      description: `Contribuição via PIX (${pix.txid})`,
      payment_method: "pix",
      status: "confirmado",
      member_id: pix.anonymous ? null : pix.member_id,
    })
    .select()
    .single();
  if (txError) throw new Error(txError.message);

  const { data: updated, error } = await db
    .from("rcc_pix_payments")
    .update({
      status: "confirmado",
      paid_at: new Date().toISOString(),
      transaction_id: tx.id,
      external_payment_id: opts?.externalPaymentId ?? pix.external_payment_id,
    })
    .eq("id", pix.id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  return updated;
}
