"use server";

import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { getSessao } from "@/lib/sessao";
import { podeGerirConvenio } from "@/lib/acessos";

// ----------------------------------------------------------------------------
// A assinatura em si é feita pelo link público (/assinar/[token]), onde a
// pessoa confirma o próprio CPF. Não existe mais uma ação "assinar" interna:
// ela só validava que havia sessão, então qualquer usuário logado podia
// assinar como qualquer papel, em qualquer convênio, e o documento saía
// afirmando que o responsável legal tinha assinado.
// ----------------------------------------------------------------------------

/** Revoga uma assinatura (ex.: o documento precisou ser corrigido). */
export async function revogarAssinatura(
  assinaturaId: string,
  prestacaoId: string,
  motivo: string
) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");
  if (!motivo.trim()) throw new Error("Informe o motivo da revogação.");

  const supabase = adminClient();

  // A assinatura manda no convênio — não confiamos no id vindo do cliente
  const { data: assinatura, error: erroBusca } = await supabase
    .from("caritas_assinaturas")
    .select("id, convenio_id, entidade_id, revogada")
    .eq("id", assinaturaId)
    .maybeSingle();

  if (erroBusca) throw new Error(`Erro ao localizar assinatura: ${erroBusca.message}`);
  if (!assinatura) throw new Error("Assinatura não encontrada.");
  if (assinatura.revogada) throw new Error("Esta assinatura já foi revogada.");

  const autorizado = await podeGerirConvenio(sessao.sub, assinatura.convenio_id, sessao.email);
  if (!autorizado) {
    throw new Error("Você não tem permissão para revogar assinaturas deste convênio.");
  }

  const { error } = await supabase
    .from("caritas_assinaturas")
    .update({
      revogada: true,
      revogada_em: new Date().toISOString(),
      revogada_motivo: `${motivo} (revogada por ${sessao.email ?? sessao.sub})`,
    })
    .eq("id", assinaturaId);

  if (error) throw new Error(`Erro ao revogar: ${error.message}`);

  revalidatePath(`/prestacoes/${prestacaoId}`);
  revalidatePath(`/imprimir/prestacao/${prestacaoId}`);
  revalidatePath(`/verificar/${assinatura.entidade_id}`);
}
