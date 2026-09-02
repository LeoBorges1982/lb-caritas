"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { adminClient } from "@/lib/supabase/admin";
import { getSessao } from "@/lib/sessao";
import { consolidarPrestacao } from "@/lib/prestacoes";
import {
  calcularHashPrestacao,
  PAPEL_ASSINATURA_LABEL,
  type PapelAssinatura,
} from "@/lib/assinaturas";

/**
 * Registra a assinatura eletrônica de um papel sobre a prestação.
 * O hash gravado é o do conteúdo consolidado no instante da assinatura.
 */
export async function assinarPrestacao(prestacaoId: string, papel: PapelAssinatura) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada. Entre novamente para assinar.");

  const c = await consolidarPrestacao(prestacaoId);
  if (!c) throw new Error("Prestação não encontrada.");

  // Signatário previsto no cadastro do convênio
  const previsto: Record<PapelAssinatura, { nome: string | null; cpf: string | null; registro: string | null }> = {
    gestor_osc: { nome: c.convenio.gestor_osc, cpf: c.convenio.gestor_osc_cpf, registro: null },
    elaborador: { nome: c.convenio.elaborador_nome, cpf: c.convenio.elaborador_cpf, registro: null },
    responsavel_legal: { nome: c.convenio.responsavel_legal_nome, cpf: c.convenio.responsavel_legal_cpf, registro: null },
    contabilista: { nome: c.convenio.contabilista_nome, cpf: c.convenio.contabilista_cpf, registro: c.convenio.contabilista_crc },
  };

  const dados = previsto[papel];
  if (!dados?.nome) {
    throw new Error(
      `O responsável do papel "${PAPEL_ASSINATURA_LABEL[papel]}" não está cadastrado no convênio. ` +
      "Preencha em Convênio → Responsáveis antes de assinar."
    );
  }

  const hash = calcularHashPrestacao(c);

  const h = await headers();
  const ip =
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    h.get("x-real-ip") ??
    null;
  const userAgent = h.get("user-agent") ?? null;

  const supabase = adminClient();
  const { error } = await supabase.from("caritas_assinaturas").insert({
    convenio_id: c.convenio.id,
    entidade: "prestacao",
    entidade_id: prestacaoId,
    papel,
    nome: dados.nome,
    cpf: dados.cpf,
    registro_profissional: dados.registro,
    hash_documento: hash,
    algoritmo: "SHA-256",
    assinado_por_id: sessao.sub,
    assinado_por_email: sessao.email,
    ip,
    user_agent: userAgent,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Este papel já foi assinado neste documento.");
    }
    throw new Error(`Erro ao registrar assinatura: ${error.message}`);
  }

  revalidatePath(`/prestacoes/${prestacaoId}`);
  revalidatePath(`/imprimir/prestacao/${prestacaoId}`);
  revalidatePath(`/verificar/${prestacaoId}`);
}

/** Revoga uma assinatura (ex.: o documento precisou ser corrigido). */
export async function revogarAssinatura(assinaturaId: string, prestacaoId: string, motivo: string) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");
  if (!motivo.trim()) throw new Error("Informe o motivo da revogação.");

  const supabase = adminClient();
  const { error } = await supabase
    .from("caritas_assinaturas")
    .update({
      revogada: true,
      revogada_em: new Date().toISOString(),
      revogada_motivo: motivo,
    })
    .eq("id", assinaturaId);

  if (error) throw new Error(`Erro ao revogar: ${error.message}`);

  revalidatePath(`/prestacoes/${prestacaoId}`);
  revalidatePath(`/imprimir/prestacao/${prestacaoId}`);
  revalidatePath(`/verificar/${prestacaoId}`);
}
