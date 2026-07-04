import { NextRequest, NextResponse } from "next/server";
import { confirmPixPayment } from "@/lib/pix";

// Webhook de confirmação de pagamento PIX.
// Preparado para receber notificações de um gateway (Efí, Mercado Pago, Asaas...).
// Autenticação simples via header X-Webhook-Secret (configurar no gateway).
//
// Payload esperado (adaptar ao gateway escolhido):
//   { "txid": "RCC...", "external_payment_id": "opcional" }
export async function POST(req: NextRequest) {
  const secret = process.env.PIX_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { txid?: string; external_payment_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.txid) {
    return NextResponse.json({ error: "txid required" }, { status: 400 });
  }

  try {
    const payment = await confirmPixPayment(body.txid, {
      externalPaymentId: body.external_payment_id,
    });
    return NextResponse.json({ ok: true, status: payment.status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "erro";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
