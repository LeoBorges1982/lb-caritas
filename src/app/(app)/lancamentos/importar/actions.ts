"use server";

import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { getSessao } from "@/lib/sessao";
import {
  parseExtrato,
  calcularMatches,
  classificarEntrada,
  type TransacaoExtrato,
  type LancamentoPrevisto,
  type MatchResult,
} from "@/lib/extratos";

export interface PreviewResult {
  formato: "ofx" | "csv";
  total: number;
  totalEntradas: number;
  totalSaidas: number;
  conciliaveis: number;
  novos: number;
  matches: MatchResult[];
}

/** Lê o arquivo, parseia, busca lançamentos previstos do convênio, calcula matches. */
export async function gerarPreview(formData: FormData): Promise<PreviewResult> {
  const arquivo = formData.get("arquivo");
  const convenioId = formData.get("convenio_id");
  if (!(arquivo instanceof File) || !convenioId) {
    throw new Error("Arquivo e convênio são obrigatórios.");
  }
  if (typeof convenioId !== "string") throw new Error("Convênio inválido.");

  const texto = await arquivo.text();
  const { formato, transacoes } = parseExtrato(texto);

  if (transacoes.length === 0) {
    throw new Error(
      `Nenhuma transação reconhecida no arquivo. Formato detectado: ${formato}. ` +
      "Verifique se é um OFX da Caixa ou CSV com colunas Data/Valor/Histórico."
    );
  }

  // Busca lançamentos previstos do convênio na janela do extrato
  const datas = transacoes.map((t) => t.data).sort();
  const inicio = datas[0];
  const fim = datas[datas.length - 1];

  const supabase = adminClient();
  const { data: previstosRaw, error } = await supabase
    .from("caritas_lancamentos")
    .select("id, data_lancamento, valor, tipo, descricao")
    .eq("convenio_id", convenioId)
    .eq("status", "previsto")
    .gte("data_lancamento", subtraiDias(inicio, 7))
    .lte("data_lancamento", somaDias(fim, 7));

  if (error) throw new Error(`Erro ao buscar previstos: ${error.message}`);

  const previstos: LancamentoPrevisto[] = (previstosRaw ?? []).map((p) => ({
    id: p.id,
    data_lancamento: p.data_lancamento,
    valor: Number(p.valor),
    tipo: p.tipo,
    descricao: p.descricao,
  }));

  const matches = calcularMatches(transacoes, previstos);

  let totalEntradas = 0;
  let totalSaidas = 0;
  let conciliaveis = 0;
  let novos = 0;
  for (const m of matches) {
    if (m.transacao.tipo === "C") totalEntradas += m.transacao.valor;
    else totalSaidas += m.transacao.valor;
    if (m.acao === "conciliar") conciliaveis++;
    if (m.acao === "criar") novos++;
  }

  return {
    formato,
    total: transacoes.length,
    totalEntradas,
    totalSaidas,
    conciliaveis,
    novos,
    matches,
  };
}

export interface DecisaoLinha {
  fitid: string;
  /** Ação escolhida pelo usuário (sobrescreve a sugerida) */
  acao: "conciliar" | "criar" | "ignorar";
  /** ID do lançamento previsto a conciliar (quando acao=conciliar) */
  match_id?: string;
  /** Quando acao=criar, dados da transação */
  transacao: TransacaoExtrato;
}

export interface ImportResult {
  criados: number;
  conciliados: number;
  ignorados: number;
}

export async function importarDecisoes(
  convenioId: string,
  contaOrigem: "corrente" | "aplicacao",
  decisoes: DecisaoLinha[]
): Promise<ImportResult> {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const supabase = adminClient();
  let criados = 0;
  let conciliados = 0;
  let ignorados = 0;

  // Conciliações (UPDATE em batch)
  const aConciliar = decisoes.filter((d) => d.acao === "conciliar" && d.match_id);
  for (const d of aConciliar) {
    const { error } = await supabase
      .from("caritas_lancamentos")
      .update({
        status: "conciliado",
        conciliado_em: d.transacao.data,
        data_pagamento: d.transacao.data,
        observacoes: appendNota(d.transacao.memo),
      })
      .eq("id", d.match_id!);
    if (error) throw new Error(`Erro ao conciliar ${d.match_id}: ${error.message}`);
    conciliados++;
  }

  // Busca parcela do convênio (valor_repasse / 12 — 12 meses padrão da Cáritas)
  const { data: convInfo } = await supabase
    .from("caritas_convenios")
    .select("valor_repasse, vigencia_inicio, vigencia_fim")
    .eq("id", convenioId)
    .maybeSingle();

  // Estima parcela como valor_repasse dividido pela duração em meses
  let parcelaConvenio: number | undefined;
  if (convInfo) {
    const ini = new Date(convInfo.vigencia_inicio);
    const fim = new Date(convInfo.vigencia_fim);
    const meses = Math.max(1, Math.round(((fim.getFullYear() - ini.getFullYear()) * 12) + (fim.getMonth() - ini.getMonth())));
    parcelaConvenio = Number(convInfo.valor_repasse) / meses;
  }

  // Criações (INSERT)
  const aCriar = decisoes.filter((d) => d.acao === "criar");
  if (aCriar.length > 0) {
    const rows = aCriar.map((d) => ({
      convenio_id: convenioId,
      tipo: d.transacao.tipo === "C"
        ? classificarEntrada(d.transacao, parcelaConvenio)
        : "despesa",
      data_lancamento: d.transacao.data,
      data_pagamento: d.transacao.data,
      descricao: d.transacao.memo || "Lançamento importado do extrato",
      valor: d.transacao.valor,
      conta_origem: contaOrigem,
      status: "realizado",
      observacoes: `Importado do extrato — FITID ${d.transacao.fitid}`,
      criado_por: sessao.sub,
    }));
    const { error } = await supabase.from("caritas_lancamentos").insert(rows);
    if (error) throw new Error(`Erro ao criar lançamentos: ${error.message}`);
    criados = rows.length;
  }

  ignorados = decisoes.filter((d) => d.acao === "ignorar").length;

  revalidatePath("/lancamentos");
  revalidatePath("/dashboard");
  revalidatePath(`/convenios/${convenioId}`);

  return { criados, conciliados, ignorados };
}

function appendNota(memo: string): string {
  return `Conciliado via importação de extrato. Histórico bancário: ${memo}`;
}

function somaDias(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function subtraiDias(iso: string, n: number): string {
  return somaDias(iso, -n);
}
