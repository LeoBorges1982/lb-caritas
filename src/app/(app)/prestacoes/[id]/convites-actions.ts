"use server";

import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { getSessao } from "@/lib/sessao";
import { consolidarPrestacao } from "@/lib/prestacoes";
import {
  calcularHashPrestacao,
  listarAssinaturas,
  montarStatusSignatarios,
  PAPEL_ASSINATURA_LABEL,
  type PapelAssinatura,
} from "@/lib/assinaturas";
import { gerarToken, listarConvites } from "@/lib/convites";

/**
 * Gera os links de assinatura de uma prestação.
 *
 * Um link por signatário previsto no convênio que ainda não assinou. Links
 * anteriores para o mesmo papel são cancelados — o hash do documento vai
 * gravado no convite, então um link antigo apontaria para um conteúdo que
 * já mudou.
 */
export async function gerarConvites(prestacaoId: string) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada. Entre novamente.");

  const c = await consolidarPrestacao(prestacaoId);
  if (!c) throw new Error("Prestação não encontrada.");

  const hash = calcularHashPrestacao(c);
  const assinaturas = await listarAssinaturas("prestacao", prestacaoId);
  const signatarios = montarStatusSignatarios(c, assinaturas, hash);

  // Só faz sentido convidar quem está cadastrado e ainda não assinou
  const pendentes = signatarios.filter((s) => s.nome && !s.assinatura);

  if (!pendentes.length) {
    throw new Error(
      assinaturas.length
        ? "Todos os responsáveis cadastrados já assinaram este documento."
        : "Nenhum responsável cadastrado no convênio. Preencha em Convênio → Responsáveis."
    );
  }

  const semCpf = pendentes.filter((s) => !s.cpf);
  if (semCpf.length) {
    throw new Error(
      `Sem CPF cadastrado para: ${semCpf.map((s) => s.nome).join(", ")}. ` +
        "O CPF é o que confirma a identidade de quem abre o link — preencha em Convênio → Responsáveis."
    );
  }

  const supabase = adminClient();

  // Cancela links ativos anteriores destes papéis (apontam para outro hash)
  const { error: erroCancelar } = await supabase
    .from("caritas_convites_assinatura")
    .update({ cancelado: true })
    .eq("entidade", "prestacao")
    .eq("entidade_id", prestacaoId)
    .is("usado_em", null)
    .eq("cancelado", false);

  if (erroCancelar) {
    throw new Error(`Erro ao limpar links anteriores: ${erroCancelar.message}`);
  }

  const novos = pendentes.map((s) => ({
    token: gerarToken(),
    convenio_id: c.convenio.id,
    entidade: "prestacao",
    entidade_id: prestacaoId,
    papel: s.papel,
    nome: s.nome as string,
    cpf: s.cpf,
    registro_profissional: s.registro,
    hash_documento: hash,
    criado_por_email: sessao.email ?? null,
  }));

  const { error } = await supabase.from("caritas_convites_assinatura").insert(novos);
  if (error) throw new Error(`Erro ao gerar links: ${error.message}`);

  revalidatePath(`/prestacoes/${prestacaoId}`);
}

/** Cancela o link de um papel (ex.: enviado para a pessoa errada). */
export async function cancelarConvite(conviteId: string, prestacaoId: string) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const supabase = adminClient();
  const { error } = await supabase
    .from("caritas_convites_assinatura")
    .update({ cancelado: true })
    .eq("id", conviteId)
    .is("usado_em", null);

  if (error) throw new Error(`Erro ao cancelar link: ${error.message}`);

  revalidatePath(`/prestacoes/${prestacaoId}`);
}

/** Gera novamente o link de um único papel. */
export async function regerarConvite(prestacaoId: string, papel: PapelAssinatura) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const c = await consolidarPrestacao(prestacaoId);
  if (!c) throw new Error("Prestação não encontrada.");

  const hash = calcularHashPrestacao(c);
  const assinaturas = await listarAssinaturas("prestacao", prestacaoId);
  const signatarios = montarStatusSignatarios(c, assinaturas, hash);
  const alvo = signatarios.find((s) => s.papel === papel);

  if (!alvo?.nome) {
    throw new Error(
      `${PAPEL_ASSINATURA_LABEL[papel]} não está cadastrado no convênio.`
    );
  }
  if (alvo.assinatura) {
    throw new Error("Este papel já assinou. Revogue a assinatura antes de gerar novo link.");
  }
  if (!alvo.cpf) {
    throw new Error(
      `Sem CPF cadastrado para ${alvo.nome}. Preencha em Convênio → Responsáveis.`
    );
  }

  const supabase = adminClient();

  await supabase
    .from("caritas_convites_assinatura")
    .update({ cancelado: true })
    .eq("entidade", "prestacao")
    .eq("entidade_id", prestacaoId)
    .eq("papel", papel)
    .is("usado_em", null)
    .eq("cancelado", false);

  const { error } = await supabase.from("caritas_convites_assinatura").insert({
    token: gerarToken(),
    convenio_id: c.convenio.id,
    entidade: "prestacao",
    entidade_id: prestacaoId,
    papel,
    nome: alvo.nome,
    cpf: alvo.cpf,
    registro_profissional: alvo.registro,
    hash_documento: hash,
    criado_por_email: sessao.email ?? null,
  });

  if (error) throw new Error(`Erro ao gerar link: ${error.message}`);

  revalidatePath(`/prestacoes/${prestacaoId}`);
}

/** Convites ativos de uma prestação, para exibir no painel. */
export async function convitesDaPrestacao(prestacaoId: string) {
  return listarConvites("prestacao", prestacaoId);
}
