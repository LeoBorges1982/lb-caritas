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
import { podeGerirConvenio } from "@/lib/acessos";

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

  if (!(await podeGerirConvenio(sessao.sub, c.convenio.id, sessao.email))) {
    throw new Error("Você não tem permissão para gerar links neste convênio.");
  }

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

  // Quem já tem link em pé para ESTE conteúdo não é mexido: o link pode já
  // estar no WhatsApp da pessoa, e recriá-lo invalidaria o que ela recebeu.
  const convitesAtivos = await listarConvites("prestacao", prestacaoId);
  const jaTemLinkValido = new Set(
    convitesAtivos
      .filter((cv) => !cv.usado_em && cv.hash_documento === hash)
      .map((cv) => cv.papel)
  );

  const alvos = pendentes.filter((s) => !jaTemLinkValido.has(s.papel));

  if (!alvos.length) {
    throw new Error(
      "Todos os responsáveis que faltam já têm link válido. Para trocar o link " +
        "de alguém, use o botão “Gerar link” na linha dele."
    );
  }

  const semCpf = alvos.filter((s) => !s.cpf);
  if (semCpf.length) {
    throw new Error(
      `Sem CPF cadastrado para: ${semCpf.map((s) => s.nome).join(", ")}. ` +
        "O CPF é o que confirma a identidade de quem abre o link — preencha em Convênio → Responsáveis."
    );
  }

  const supabase = adminClient();

  // Cancela apenas os links desatualizados dos papéis que vamos regerar
  const { error: erroCancelar } = await supabase
    .from("caritas_convites_assinatura")
    .update({ cancelado: true })
    .eq("entidade", "prestacao")
    .eq("entidade_id", prestacaoId)
    .in("papel", alvos.map((s) => s.papel))
    .is("usado_em", null)
    .eq("cancelado", false);

  if (erroCancelar) {
    throw new Error(`Erro ao limpar links anteriores: ${erroCancelar.message}`);
  }

  const novos = alvos.map((s) => ({
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

  const { data: convite } = await supabase
    .from("caritas_convites_assinatura")
    .select("id, convenio_id")
    .eq("id", conviteId)
    .maybeSingle();

  if (!convite) throw new Error("Link não encontrado.");
  if (!(await podeGerirConvenio(sessao.sub, convite.convenio_id, sessao.email))) {
    throw new Error("Você não tem permissão para cancelar links deste convênio.");
  }

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

  if (!(await podeGerirConvenio(sessao.sub, c.convenio.id, sessao.email))) {
    throw new Error("Você não tem permissão para gerar links neste convênio.");
  }

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
