"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { getSessao } from "@/lib/sessao";
import type { StatusReembolso } from "@/lib/reembolsos";

export async function criarReembolso(formData: FormData) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const get = (k: string) => {
    const v = formData.get(k);
    return v === null || v === "" ? null : String(v);
  };

  const convenio_id = get("convenio_id");
  const solicitante_nome = get("solicitante_nome");
  const descricao = get("descricao");
  const data_despesa = get("data_despesa");
  const valorStr = get("valor")?.replace(/\./g, "").replace(",", ".");
  const valor = valorStr ? Number(valorStr) : NaN;

  if (!convenio_id) throw new Error("Convênio é obrigatório.");
  if (!solicitante_nome) throw new Error("Solicitante é obrigatório.");
  if (!descricao) throw new Error("Descrição é obrigatória.");
  if (!data_despesa) throw new Error("Data da despesa é obrigatória.");
  if (!Number.isFinite(valor) || valor <= 0) throw new Error("Valor inválido.");

  const supabase = adminClient();
  const { data, error } = await supabase
    .from("caritas_reembolsos")
    .insert({
      convenio_id,
      categoria_id: get("categoria_id"),
      meta_id: get("meta_id"),
      solicitante_nome,
      solicitante_cpf: get("solicitante_cpf"),
      descricao,
      data_despesa,
      valor,
      comprovante_numero: get("comprovante_numero"),
      observacoes: get("observacoes"),
      solicitado_por: sessao.sub,
      status: "solicitado",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Erro ao criar reembolso: ${error.message}`);

  revalidatePath("/reembolsos");
  redirect(`/reembolsos/${data!.id}`);
}

export async function aprovarReembolso(id: string) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const supabase = adminClient();
  const { error } = await supabase
    .from("caritas_reembolsos")
    .update({
      status: "aprovado",
      aprovado_em: new Date().toISOString().slice(0, 10),
      aprovado_por: sessao.sub,
    })
    .eq("id", id);
  if (error) throw new Error(`Erro ao aprovar: ${error.message}`);

  revalidatePath(`/reembolsos/${id}`);
  revalidatePath("/reembolsos");
}

export async function rejeitarReembolso(id: string, motivo: string) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");
  if (!motivo.trim()) throw new Error("Motivo da rejeição é obrigatório.");

  const supabase = adminClient();
  const { error } = await supabase
    .from("caritas_reembolsos")
    .update({ status: "rejeitado", motivo_rejeicao: motivo })
    .eq("id", id);
  if (error) throw new Error(`Erro ao rejeitar: ${error.message}`);

  revalidatePath(`/reembolsos/${id}`);
  revalidatePath("/reembolsos");
}

/**
 * Marca como pago e GERA o lançamento (despesa) automaticamente,
 * vinculado ao reembolso pra rastreabilidade.
 */
export async function pagarReembolso(
  id: string,
  data_pagamento: string,
  forma_pagamento: string,
  conta_origem: "corrente" | "aplicacao"
) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const supabase = adminClient();

  const { data: r, error: errR } = await supabase
    .from("caritas_reembolsos")
    .select("*")
    .eq("id", id)
    .single();
  if (errR || !r) throw new Error("Reembolso não encontrado.");

  if (r.status !== "aprovado") throw new Error("Só é possível pagar reembolsos aprovados.");

  // Gera o lançamento de despesa
  const { data: lanc, error: errL } = await supabase
    .from("caritas_lancamentos")
    .insert({
      convenio_id: r.convenio_id,
      categoria_id: r.categoria_id,
      meta_id: r.meta_id,
      tipo: "despesa",
      data_lancamento: data_pagamento,
      data_pagamento,
      descricao: `Reembolso a ${r.solicitante_nome}: ${r.descricao}`,
      valor: r.valor,
      fornecedor_nome: r.solicitante_nome,
      fornecedor_documento: r.solicitante_cpf,
      forma_pagamento,
      conta_origem,
      status: "realizado",
      observacoes: `Pagamento de reembolso #${id}. ${r.observacoes ?? ""}`,
      criado_por: sessao.sub,
    })
    .select("id")
    .single();
  if (errL) throw new Error(`Erro ao gerar lançamento: ${errL.message}`);

  // Atualiza o reembolso
  const { error: errU } = await supabase
    .from("caritas_reembolsos")
    .update({
      status: "pago",
      pago_em: data_pagamento,
      lancamento_id: lanc!.id,
    })
    .eq("id", id);
  if (errU) throw new Error(`Erro ao atualizar reembolso: ${errU.message}`);

  revalidatePath(`/reembolsos/${id}`);
  revalidatePath("/reembolsos");
  revalidatePath("/lancamentos");
  revalidatePath("/dashboard");
}

export async function deletarReembolso(id: string) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const supabase = adminClient();
  const { data: r } = await supabase.from("caritas_reembolsos").select("status").eq("id", id).single();
  if (r?.status === "pago") throw new Error("Não é possível excluir reembolso pago. Cancele o lançamento antes.");

  const { error } = await supabase.from("caritas_reembolsos").delete().eq("id", id);
  if (error) throw new Error(`Erro ao excluir: ${error.message}`);

  revalidatePath("/reembolsos");
  redirect("/reembolsos");
}
