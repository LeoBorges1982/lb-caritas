"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { getSessao } from "@/lib/sessao";
import type { TipoLancamento, FormaPagamento, DocumentoTipo, ContaOrigem } from "@/lib/lancamentos";

type Payload = {
  convenio_id: string;
  meta_id: string | null;
  categoria_id: string | null;
  tipo: TipoLancamento;
  data_lancamento: string;
  data_pagamento: string | null;
  descricao: string;
  valor: number;
  fornecedor_nome: string | null;
  fornecedor_documento: string | null;
  documento_tipo: DocumentoTipo | null;
  documento_numero: string | null;
  documento_data: string | null;
  documento_valor: number | null;
  forma_pagamento: FormaPagamento | null;
  conta_origem: ContaOrigem | null;
  status: "previsto" | "realizado";
  observacoes: string | null;
};

function parseForm(fd: FormData): Payload {
  const get = (k: string) => {
    const v = fd.get(k);
    return v === null || v === "" ? null : String(v);
  };
  const getN = (k: string): number | null => {
    const v = get(k);
    if (v === null) return null;
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const tipo = (get("tipo") || "despesa") as TipoLancamento;
  const valor = getN("valor");
  if (valor === null || valor <= 0) {
    throw new Error("Valor é obrigatório e deve ser maior que zero.");
  }

  const convenio_id = get("convenio_id");
  if (!convenio_id) throw new Error("Convênio é obrigatório.");

  const data_lancamento = get("data_lancamento");
  if (!data_lancamento) throw new Error("Data de lançamento é obrigatória.");

  const descricao = get("descricao");
  if (!descricao) throw new Error("Descrição é obrigatória.");

  return {
    convenio_id,
    meta_id: get("meta_id"),
    categoria_id: get("categoria_id"),
    tipo,
    data_lancamento,
    data_pagamento: get("data_pagamento"),
    descricao,
    valor,
    fornecedor_nome: get("fornecedor_nome"),
    fornecedor_documento: get("fornecedor_documento"),
    documento_tipo: get("documento_tipo") as DocumentoTipo | null,
    documento_numero: get("documento_numero"),
    documento_data: get("documento_data"),
    documento_valor: getN("documento_valor"),
    forma_pagamento: get("forma_pagamento") as FormaPagamento | null,
    conta_origem: get("conta_origem") as ContaOrigem | null,
    status: (get("status") || "previsto") as "previsto" | "realizado",
    observacoes: get("observacoes"),
  };
}

export async function criarLancamento(fd: FormData) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const payload = parseForm(fd);
  const supabase = adminClient();

  const { error, data } = await supabase
    .from("caritas_lancamentos")
    .insert({ ...payload, criado_por: sessao.sub })
    .select("id")
    .single();

  if (error) throw new Error(`Erro ao criar lançamento: ${error.message}`);

  revalidatePath("/lancamentos");
  revalidatePath("/dashboard");
  revalidatePath(`/convenios/${payload.convenio_id}`);
  redirect(`/lancamentos/${data!.id}`);
}

export async function atualizarLancamento(id: string, fd: FormData) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const payload = parseForm(fd);
  const supabase = adminClient();

  const { error } = await supabase
    .from("caritas_lancamentos")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(`Erro ao atualizar lançamento: ${error.message}`);

  revalidatePath("/lancamentos");
  revalidatePath(`/lancamentos/${id}`);
  revalidatePath("/dashboard");
  revalidatePath(`/convenios/${payload.convenio_id}`);
  redirect(`/lancamentos/${id}`);
}

export async function conciliarLancamento(id: string, dataConciliacao: string) {
  const supabase = adminClient();
  const { error } = await supabase
    .from("caritas_lancamentos")
    .update({ status: "conciliado", conciliado_em: dataConciliacao })
    .eq("id", id);
  if (error) throw new Error(`Erro ao conciliar: ${error.message}`);

  revalidatePath("/lancamentos");
  revalidatePath(`/lancamentos/${id}`);
  revalidatePath("/dashboard");
}

export async function glosarLancamento(id: string, motivo: string, valorGlosa: number) {
  if (!motivo.trim()) throw new Error("Motivo da glosa é obrigatório.");
  const supabase = adminClient();
  const { error } = await supabase
    .from("caritas_lancamentos")
    .update({ status: "glosado", glosa_motivo: motivo, glosa_valor: valorGlosa })
    .eq("id", id);
  if (error) throw new Error(`Erro ao glosar: ${error.message}`);

  revalidatePath("/lancamentos");
  revalidatePath(`/lancamentos/${id}`);
  revalidatePath("/dashboard");
}

export async function cancelarLancamento(id: string) {
  const supabase = adminClient();
  const { error } = await supabase
    .from("caritas_lancamentos")
    .update({ status: "cancelado" })
    .eq("id", id);
  if (error) throw new Error(`Erro ao cancelar: ${error.message}`);

  revalidatePath("/lancamentos");
  revalidatePath(`/lancamentos/${id}`);
  revalidatePath("/dashboard");
}

export async function reabrirLancamento(id: string) {
  const supabase = adminClient();
  const { error } = await supabase
    .from("caritas_lancamentos")
    .update({ status: "realizado", conciliado_em: null, glosa_motivo: null, glosa_valor: null })
    .eq("id", id);
  if (error) throw new Error(`Erro ao reabrir: ${error.message}`);

  revalidatePath("/lancamentos");
  revalidatePath(`/lancamentos/${id}`);
  revalidatePath("/dashboard");
}
