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
  valor_pago_total: number | null;
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
    valor_pago_total: getN("valor_pago_total"),
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
  const ignorarTeto = fd.get("ignorar_teto") === "1";
  const supabase = adminClient();

  // Valida teto/saldo da rubrica (só pra despesa)
  if (payload.tipo === "despesa" && payload.categoria_id && !ignorarTeto) {
    const { data: val } = await supabase.rpc("caritas_validar_lancamento", {
      p_convenio_id:  payload.convenio_id,
      p_categoria_id: payload.categoria_id,
      p_valor:        payload.valor,
      p_data:         payload.data_lancamento,
    });
    const r = Array.isArray(val) ? val[0] : val;
    if (r && r.ok === false) {
      throw new Error(`🚫 ${r.motivo}. Tentando lançar ${payload.valor.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}.`);
    }
  }

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
  const ignorarTeto = fd.get("ignorar_teto") === "1";
  const supabase = adminClient();

  if (payload.tipo === "despesa" && payload.categoria_id && !ignorarTeto) {
    const { data: val } = await supabase.rpc("caritas_validar_lancamento", {
      p_convenio_id:   payload.convenio_id,
      p_categoria_id:  payload.categoria_id,
      p_valor:         payload.valor,
      p_data:          payload.data_lancamento,
      p_lancamento_id: id,
    });
    const r = Array.isArray(val) ? val[0] : val;
    if (r && r.ok === false) {
      throw new Error(`🚫 ${r.motivo}. Tentando lançar ${payload.valor.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}.`);
    }
  }

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

/** Exclui lançamento de verdade (DELETE, não cancela) */
export async function excluirLancamento(id: string) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const supabase = adminClient();
  const { data: lanc } = await supabase
    .from("caritas_lancamentos")
    .select("convenio_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("caritas_lancamentos")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`Erro ao excluir: ${error.message}`);

  revalidatePath("/lancamentos");
  revalidatePath("/dashboard");
  if (lanc?.convenio_id) revalidatePath(`/convenios/${lanc.convenio_id}`);
  redirect("/lancamentos");
}

/**
 * Replica lançamentos do mês anterior pro mês informado.
 * - Só copia despesas com status realizado/conciliado/previsto
 * - Pula rubricas de provisão/rescisão/férias/13º automaticamente (por nome)
 * - Cria com status "previsto" e datas ajustadas pro novo mês
 * - Não duplica: pula despesas que já têm correspondente no mês destino (mesma rubrica + descrição)
 */
export async function replicarMesAnterior(args: {
  convenio_id: string;
  mes_destino: string;  // 'YYYY-MM-01'
  excluir_codigos?: string[];
}) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const supabase = adminClient();

  const mesDestino = new Date(args.mes_destino + "T00:00:00");
  const mesAnterior = new Date(mesDestino);
  mesAnterior.setMonth(mesAnterior.getMonth() - 1);

  const mesAntStr = mesAnterior.toISOString().slice(0, 7);
  const inicioMesAnt = `${mesAntStr}-01`;
  const ultimoDiaAnt = new Date(mesDestino);
  ultimoDiaAnt.setDate(0);
  const fimMesAnt = ultimoDiaAnt.toISOString().slice(0, 10);

  const mesDestStr = args.mes_destino.slice(0, 7);
  const inicioMesDest = `${mesDestStr}-01`;
  const ultimoDiaDest = new Date(mesDestino);
  ultimoDiaDest.setMonth(ultimoDiaDest.getMonth() + 1);
  ultimoDiaDest.setDate(0);
  const fimMesDest = ultimoDiaDest.toISOString().slice(0, 10);

  // Busca rubricas a excluir (provisão/rescisão/férias/13º — por nome ou código)
  const { data: rubricas } = await supabase
    .from("caritas_categorias_despesa")
    .select("id, codigo, nome")
    .eq("convenio_id", args.convenio_id);

  const codigosExtra = (args.excluir_codigos ?? []).map((c) => c.toLowerCase());
  const palavrasExcluir = ["provis", "rescis", "férias", "ferias", "13", "decimo", "décimo"];

  const idsExcluir = (rubricas ?? [])
    .filter((r) => {
      const t = `${r.codigo} ${r.nome}`.toLowerCase();
      return palavrasExcluir.some((p) => t.includes(p)) ||
             codigosExtra.some((c) => t.includes(c));
    })
    .map((r) => r.id);

  // Lançamentos do mês anterior
  let qAnt = supabase
    .from("caritas_lancamentos")
    .select("*")
    .eq("convenio_id", args.convenio_id)
    .eq("tipo", "despesa")
    .gte("data_lancamento", inicioMesAnt)
    .lte("data_lancamento", fimMesAnt)
    .not("status", "in", "(cancelado,glosado)");

  if (idsExcluir.length > 0) {
    qAnt = qAnt.not("categoria_id", "in", `(${idsExcluir.join(",")})`);
  }

  const { data: anteriores, error: errA } = await qAnt;
  if (errA) throw new Error(`Erro ao buscar mês anterior: ${errA.message}`);
  if (!anteriores || anteriores.length === 0) {
    throw new Error(`Nenhum lançamento elegível em ${mesAntStr}.`);
  }

  // Lançamentos já existentes no mês destino (pra não duplicar)
  const { data: existentes } = await supabase
    .from("caritas_lancamentos")
    .select("categoria_id, descricao")
    .eq("convenio_id", args.convenio_id)
    .eq("tipo", "despesa")
    .gte("data_lancamento", inicioMesDest)
    .lte("data_lancamento", fimMesDest);

  const jaTem = new Set((existentes ?? []).map((e) => `${e.categoria_id}__${e.descricao}`));

  const novos = anteriores
    .filter((l) => !jaTem.has(`${l.categoria_id}__${l.descricao}`))
    .map((l) => {
      const novaData = new Date(l.data_lancamento);
      novaData.setMonth(novaData.getMonth() + 1);
      return {
        convenio_id: l.convenio_id,
        meta_id: l.meta_id,
        categoria_id: l.categoria_id,
        tipo: l.tipo,
        data_lancamento: novaData.toISOString().slice(0, 10),
        data_pagamento: null,
        descricao: l.descricao,
        valor: l.valor,
        fornecedor_nome: l.fornecedor_nome,
        fornecedor_documento: l.fornecedor_documento,
        documento_tipo: l.documento_tipo,
        documento_numero: null,
        documento_data: null,
        documento_valor: l.valor,
        forma_pagamento: l.forma_pagamento,
        conta_origem: l.conta_origem,
        status: "previsto",
        observacoes: `Replicado de ${l.data_lancamento}`,
        criado_por: sessao.sub,
      };
    });

  if (novos.length === 0) {
    return { criados: 0, pulados: anteriores.length };
  }

  const { error: errIns } = await supabase
    .from("caritas_lancamentos")
    .insert(novos);

  if (errIns) throw new Error(`Erro ao inserir: ${errIns.message}`);

  revalidatePath("/lancamentos");
  revalidatePath("/dashboard");
  revalidatePath(`/convenios/${args.convenio_id}`);

  return { criados: novos.length, pulados: anteriores.length - novos.length };
}
