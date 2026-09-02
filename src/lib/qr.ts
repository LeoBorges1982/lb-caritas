import QRCode from "qrcode";

/**
 * Gera um QR code como data URL (PNG embutido), para funcionar na impressão
 * sem depender de requisição externa.
 */
export async function gerarQrDataUrl(texto: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(texto, {
      margin: 1,
      width: 240,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#FFFFFF" },
    });
  } catch {
    return null;
  }
}

/** URL pública de verificação de um documento. */
export function urlVerificacao(prestacaoId: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
    "https://caritas.leoborgescontador.com.br";
  return `${base}/verificar/${prestacaoId}`;
}
