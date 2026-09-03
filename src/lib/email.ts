// ============================================================================
// Envio de e-mail via Resend (HTTP direto, sem dependência adicional).
//
// Regra de ouro: e-mail NUNCA derruba a operação que o disparou. Se a chave
// não estiver configurada ou o envio falhar, registramos no log e seguimos —
// uma assinatura não pode ser perdida porque o e-mail caiu.
// ============================================================================

const ENDPOINT = "https://api.resend.com/emails";

export interface ResultadoEnvio {
  enviado: boolean;
  motivo?: string;
}

export async function enviarEmail(params: {
  para: string | string[];
  assunto: string;
  html: string;
}): Promise<ResultadoEnvio> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) {
    console.warn("[email] RESEND_API_KEY não configurada — envio ignorado.");
    return { enviado: false, motivo: "RESEND_API_KEY ausente" };
  }

  const remetente =
    process.env.EMAIL_FROM ??
    "LB Cáritas <naoresponda@leoborgescontador.com.br>";

  try {
    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: remetente,
        to: Array.isArray(params.para) ? params.para : [params.para],
        subject: params.assunto,
        html: params.html,
      }),
    });

    if (!r.ok) {
      const corpo = await r.text().catch(() => "");
      console.error(`[email] Resend respondeu ${r.status}: ${corpo.slice(0, 300)}`);
      return { enviado: false, motivo: `HTTP ${r.status}` };
    }

    return { enviado: true };
  } catch (e) {
    console.error("[email] Falha ao chamar o Resend:", e);
    return { enviado: false, motivo: e instanceof Error ? e.message : "erro de rede" };
  }
}

/** Destinatário das notificações de prestação de contas. */
export function destinatarioPrestacao(): string[] {
  const bruto = process.env.EMAIL_PRESTACAO_PARA ?? "contato@lbcontabilrj.com";
  return bruto.split(",").map((e) => e.trim()).filter(Boolean);
}
