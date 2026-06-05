/**
 * Cliente mínimo da Anthropic API — sem SDK, só fetch.
 * Doc: https://docs.anthropic.com/en/api/messages
 */

const MODELO_PADRAO = "claude-sonnet-4-5";

export interface MensagemClaude {
  role: "user" | "assistant";
  content: string;
}

export async function chamarClaude(args: {
  system: string;
  mensagens: MensagemClaude[];
  modelo?: string;
  max_tokens?: number;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: args.modelo || MODELO_PADRAO,
      max_tokens: args.max_tokens || 1024,
      system: args.system,
      messages: args.mensagens,
    }),
  });

  if (!r.ok) {
    const erro = await r.text();
    throw new Error(`Anthropic API erro ${r.status}: ${erro}`);
  }

  const data = await r.json();
  const texto = data?.content?.[0]?.text;
  if (typeof texto !== "string") throw new Error("Resposta sem texto");
  return texto.trim();
}
