import { randomBytes } from "crypto";
import { adminClient } from "@/lib/supabase/admin";
import type { PapelAssinatura } from "@/lib/assinaturas";

// ============================================================================
// Convites de assinatura — um link exclusivo por signatário.
//
// O link permite assinar sem ter login no sistema. A identidade é conferida
// pelo CPF cadastrado no convênio, e a trilha grava o acesso real da pessoa.
// ============================================================================

export interface ConviteAssinatura {
  id: string;
  token: string;
  convenio_id: string | null;
  entidade: string;
  entidade_id: string;
  papel: PapelAssinatura;
  nome: string;
  cpf: string | null;
  registro_profissional: string | null;
  hash_documento: string;
  criado_em: string;
  criado_por_email: string | null;
  expira_em: string;
  usado_em: string | null;
  assinatura_id: string | null;
  cancelado: boolean;
  tentativas: number;
}

/** Máximo de tentativas de CPF antes de bloquear o convite. */
export const MAX_TENTATIVAS = 5;

/**
 * Token de 32 bytes (256 bits) em base64url — é a credencial do link.
 * Espaço de busca grande o bastante para não ser adivinhável.
 */
export function gerarToken(): string {
  return randomBytes(32).toString("base64url");
}

/** URL completa do link de assinatura. */
export function urlAssinatura(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
    "https://caritas.leoborgescontador.com.br";
  return `${base}/assinar/${token}`;
}

/** Convites de um documento (inclui usados e cancelados, para histórico). */
export async function listarConvites(
  entidade: "prestacao" | "balancete",
  entidadeId: string
): Promise<ConviteAssinatura[]> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("caritas_convites_assinatura")
    .select("*")
    .eq("entidade", entidade)
    .eq("entidade_id", entidadeId)
    .eq("cancelado", false)
    .order("criado_em");

  if (error) {
    if (tabelaInexistente(error)) return [];
    throw new Error(`Erro ao listar convites: ${error.message}`);
  }
  return (data ?? []) as ConviteAssinatura[];
}

/** Busca um convite pelo token (usado pela página pública). */
export async function buscarConvitePorToken(
  token: string
): Promise<ConviteAssinatura | null> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("caritas_convites_assinatura")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    if (tabelaInexistente(error)) return null;
    throw new Error(`Erro ao buscar convite: ${error.message}`);
  }
  return (data as ConviteAssinatura) ?? null;
}

export type MotivoInvalido =
  | "cancelado"
  | "expirado"
  | "ja_usado"
  | "bloqueado"
  | "documento_alterado";

/**
 * Diz por que um convite não pode ser usado — ou null se estiver válido.
 * `hashAtual` é o hash do documento agora; se mudou desde a geração do
 * link, a pessoa estaria assinando algo diferente do que recebeu.
 */
export function motivoInvalido(
  convite: ConviteAssinatura,
  hashAtual: string,
  agoraISO: string
): MotivoInvalido | null {
  if (convite.cancelado) return "cancelado";
  if (convite.usado_em) return "ja_usado";
  if (convite.tentativas >= MAX_TENTATIVAS) return "bloqueado";
  if (convite.expira_em < agoraISO) return "expirado";
  if (convite.hash_documento !== hashAtual) return "documento_alterado";
  return null;
}

export const MOTIVO_LABEL: Record<MotivoInvalido, string> = {
  cancelado: "Este link foi cancelado por quem o enviou.",
  ja_usado: "Este documento já foi assinado por você.",
  bloqueado:
    "Link bloqueado por excesso de tentativas de CPF. Peça um novo link a quem lhe enviou.",
  expirado: "Este link expirou. Peça um novo a quem lhe enviou.",
  documento_alterado:
    "O documento foi alterado depois que este link foi gerado. Por segurança, a assinatura não pode ser feita — peça um link atualizado.",
};

/** Compara CPF ignorando pontuação. */
export function cpfConfere(informado: string, cadastrado: string | null): boolean {
  if (!cadastrado) return false;
  const a = informado.replace(/\D/g, "");
  const b = cadastrado.replace(/\D/g, "");
  return a.length === 11 && a === b;
}

function tabelaInexistente(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (/caritas_convites_assinatura/.test(error.message ?? "") &&
      /does not exist|not find|schema cache/i.test(error.message ?? ""))
  );
}
