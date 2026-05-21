import { adminClient } from "@/lib/supabase/admin";
import type { LancamentoBalancete } from "@/lib/balancetes";
import type { TipoLancamento, StatusLancamento } from "@/lib/lancamentos";

export type TipoPrestacao = "parcial" | "final";
export type StatusPrestacao =
  | "rascunho"
  | "protocolada"
  | "em_analise"
  | "aprovada"
  | "aprovada_ressalvas"
  | "rejeitada";

export interface PrestacaoListItem {
  id: string;
  convenio_id: string;
  convenio_numero: string;
  tipo: TipoPrestacao;
  periodo_inicio: string;
  periodo_fim: string;
  status: StatusPrestacao;
  protocolo: string | null;
  protocolada_em: string | null;
  analisada_em: string | null;
  glosa_total: number;
  criado_em: string;
}

export interface RubricaExecucao {
  categoria_id: string | null;
  codigo: string | null;
  nome: string | null;
  grupo: string | null;
  valor_previsto: number;
  valor_realizado: number;
  valor_glosado: number;
  saldo: number;
  pct: number;
  qtd: number;
}

export interface MetaExecucao {
  id: string;
  codigo: string;
  titulo: string;
  objetivo: string | null;
  indicador: string | null;
  quantidade_prevista: number | null;
  unidade_medida: string | null;
  valor_realizado: number;
  qtd_lancamentos: number;
}

export interface ConciliacaoLinha {
  total_lancamentos: number;
  conciliados: number;
  pendentes: number;
}

export interface PrestacaoConsolidada {
  prestacao: {
    id: string;
    tipo: TipoPrestacao;
    periodo_inicio: string;
    periodo_fim: string;
    status: StatusPrestacao;
    protocolo: string | null;
    protocolada_em: string | null;
    analisada_em: string | null;
    parecer_tecnico: string | null;
    glosa_total: number;
    observacoes: string | null;
    criado_em: string;
  };
  convenio: {
    id: string;
    numero: string;
    tipo: string;
    objeto: string;
    publico_alvo: string | null;
    valor_total: number;
    valor_repasse: number;
    valor_contrapartida: number;
    vigencia_inicio: string;
    vigencia_fim: string;
    banco: string | null;
    agencia: string | null;
    conta_corrente: string | null;
    conta_aplicacao: string | null;
    gestor_publico: string | null;
    gestor_osc: string | null;
  };
  osc: { nome: string; cnpj: string; responsavel: string | null };
  orgao: { nome: string; sigla: string | null; fundo: string | null };
  resumo: {
    saldo_inicial: number;
    total_entradas: number;
    total_saidas: number;
    rendimentos: number;
    saldo_final: number;
    glosa_total: number;
    qtd_lancamentos: number;
  };
  rubricas: RubricaExecucao[];
  metas: MetaExecucao[];
  conciliacao: ConciliacaoLinha;
  lancamentos: LancamentoBalancete[];
  glosados: LancamentoBalancete[];
}

export const STATUS_PRESTACAO_LABEL: Record<StatusPrestacao, string> = {
  rascunho: "Rascunho",
  protocolada: "Protocolada",
  em_analise: "Em análise",
  aprovada: "Aprovada",
  aprovada_ressalvas: "Aprovada com ressalvas",
  rejeitada: "Rejeitada",
};

export const STATUS_PRESTACAO_CORES: Record<StatusPrestacao, string> = {
  rascunho: "bg-slate-100 text-slate-700 border-slate-200",
  protocolada: "bg-blue-100 text-blue-700 border-blue-200",
  em_analise: "bg-amber-100 text-amber-800 border-amber-200",
  aprovada: "bg-emerald-100 text-emerald-700 border-emerald-200",
  aprovada_ressalvas: "bg-teal-100 text-teal-700 border-teal-200",
  rejeitada: "bg-red-100 text-red-700 border-red-200",
};

export const TIPO_PRESTACAO_LABEL: Record<TipoPrestacao, string> = {
  parcial: "Parcial",
  final: "Final",
};

// ----------------------------------------------------------------------------
// Listagem
// ----------------------------------------------------------------------------
export async function listarPrestacoes(convenioId?: string): Promise<PrestacaoListItem[]> {
  const supabase = adminClient();
  let q = supabase
    .from("caritas_prestacoes_contas")
    .select(`
      id, convenio_id, tipo, periodo_inicio, periodo_fim, status,
      protocolo, protocolada_em, analisada_em, glosa_total, criado_em,
      convenio:caritas_convenios ( numero )
    `)
    .order("periodo_fim", { ascending: false });
  if (convenioId) q = q.eq("convenio_id", convenioId);

  const { data, error } = await q;
  if (error) throw new Error(`Erro ao listar prestações: ${error.message}`);

  type Row = Omit<PrestacaoListItem, "convenio_numero" | "glosa_total"> & {
    glosa_total: number | string;
    convenio: { numero: string } | { numero: string }[] | null;
  };
  const pick = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  return (data as Row[] ?? []).map((r) => ({
    ...r,
    glosa_total: Number(r.glosa_total),
    convenio_numero: pick(r.convenio)?.numero ?? "",
  }));
}

// ----------------------------------------------------------------------------
// Consolidado (para a tela de detalhe e impressão)
// ----------------------------------------------------------------------------
export async function consolidarPrestacao(id: string): Promise<PrestacaoConsolidada | null> {
  const supabase = adminClient();

  const { data: prestacao, error } = await supabase
    .from("caritas_prestacoes_contas")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar prestação: ${error.message}`);
  if (!prestacao) return null;

  const convenioId: string = prestacao.convenio_id;
  const inicio: string = prestacao.periodo_inicio;
  const fim: string = prestacao.periodo_fim;

  const [convRes, antesRes, periodoRes, categoriasRes, metasRes] = await Promise.all([
    supabase
      .from("caritas_convenios")
      .select(`
        id, numero, tipo, objeto, publico_alvo,
        valor_total, valor_repasse, valor_contrapartida,
        vigencia_inicio, vigencia_fim,
        banco, agencia, conta_corrente, conta_aplicacao,
        gestor_publico, gestor_osc,
        osc:caritas_oscs ( nome, cnpj, responsavel ),
        orgao:caritas_orgaos_concedentes ( nome, sigla, fundo )
      `)
      .eq("id", convenioId)
      .maybeSingle(),
    // Saldo antes do período
    supabase
      .from("caritas_lancamentos")
      .select("tipo, valor, status")
      .eq("convenio_id", convenioId)
      .neq("status", "cancelado")
      .lt("data_lancamento", inicio),
    // Lançamentos do período
    supabase
      .from("caritas_lancamentos")
      .select(`
        id, data_lancamento, data_pagamento, tipo, status, descricao,
        fornecedor_nome, documento_numero, valor, glosa_valor,
        categoria_id, meta_id,
        categoria:caritas_categorias_despesa ( codigo, nome, grupo, valor_previsto ),
        meta:caritas_metas ( codigo, titulo )
      `)
      .eq("convenio_id", convenioId)
      .neq("status", "cancelado")
      .gte("data_lancamento", inicio)
      .lte("data_lancamento", fim)
      .order("data_lancamento"),
    // Todas as categorias (para apresentar mesmo sem lançamento)
    supabase
      .from("caritas_categorias_despesa")
      .select("id, codigo, nome, grupo, valor_previsto, ordem")
      .eq("convenio_id", convenioId)
      .order("ordem"),
    // Metas
    supabase
      .from("caritas_metas")
      .select("id, codigo, titulo, indicador, quantidade_prevista, unidade_medida, ordem")
      .eq("convenio_id", convenioId)
      .order("ordem"),
  ]);

  if (!convRes.data) return null;
  if (antesRes.error) throw new Error(antesRes.error.message);
  if (periodoRes.error) throw new Error(periodoRes.error.message);

  const pick = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  // Saldo inicial
  let saldo_inicial = 0;
  for (const l of antesRes.data ?? []) {
    const v = Number(l.valor);
    if (l.tipo === "repasse" || l.tipo === "rendimento") saldo_inicial += v;
    else if (l.tipo === "despesa" && l.status !== "glosado") saldo_inicial -= v;
    else if (l.tipo === "devolucao") saldo_inicial -= v;
  }

  // Lançamentos do período (enriquecidos)
  type LancRow = {
    id: string;
    data_lancamento: string;
    data_pagamento: string | null;
    tipo: TipoLancamento;
    status: StatusLancamento;
    descricao: string;
    fornecedor_nome: string | null;
    documento_numero: string | null;
    valor: number | string;
    glosa_valor: number | string | null;
    categoria_id: string | null;
    meta_id: string | null;
    categoria: { codigo: string; nome: string; grupo: string | null; valor_previsto: number | string } | { codigo: string; nome: string; grupo: string | null; valor_previsto: number | string }[] | null;
    meta: { codigo: string; titulo: string } | { codigo: string; titulo: string }[] | null;
  };

  const lancamentosDetalhados: LancamentoBalancete[] = ((periodoRes.data ?? []) as LancRow[]).map((r) => {
    const c = pick(r.categoria);
    const m = pick(r.meta);
    return {
      id: r.id,
      data_lancamento: r.data_lancamento,
      data_pagamento: r.data_pagamento,
      tipo: r.tipo,
      status: r.status,
      descricao: r.descricao,
      fornecedor_nome: r.fornecedor_nome,
      documento_numero: r.documento_numero,
      valor: Number(r.valor),
      categoria_codigo: c?.codigo ?? null,
      categoria_nome: c?.nome ?? null,
      meta_codigo: m?.codigo ?? null,
    };
  });

  // Totais e KPIs do período
  let total_entradas = 0;
  let total_saidas = 0;
  let rendimentos = 0;
  let glosa_total = 0;
  let conciliados = 0;
  for (const r of (periodoRes.data ?? []) as LancRow[]) {
    const v = Number(r.valor);
    if (r.tipo === "repasse") total_entradas += v;
    else if (r.tipo === "rendimento") {
      total_entradas += v;
      rendimentos += v;
    } else if (r.tipo === "despesa" && r.status !== "glosado") {
      total_saidas += v;
    } else if (r.tipo === "devolucao") {
      total_saidas += v;
    }
    if (r.status === "glosado") {
      glosa_total += Number(r.glosa_valor ?? r.valor);
    }
    if (r.status === "conciliado") conciliados += 1;
  }

  // Por rubrica (incluindo categorias sem lançamento)
  const realizadoPorCategoria = new Map<string, { realizado: number; glosado: number; qtd: number }>();
  for (const r of (periodoRes.data ?? []) as LancRow[]) {
    if (r.tipo !== "despesa" || !r.categoria_id) continue;
    const cur = realizadoPorCategoria.get(r.categoria_id) ?? { realizado: 0, glosado: 0, qtd: 0 };
    if (r.status === "glosado") cur.glosado += Number(r.glosa_valor ?? r.valor);
    else cur.realizado += Number(r.valor);
    cur.qtd += 1;
    realizadoPorCategoria.set(r.categoria_id, cur);
  }

  const rubricas: RubricaExecucao[] = (categoriasRes.data ?? []).map((c) => {
    const prev = Number(c.valor_previsto);
    const r = realizadoPorCategoria.get(c.id) ?? { realizado: 0, glosado: 0, qtd: 0 };
    return {
      categoria_id: c.id,
      codigo: c.codigo,
      nome: c.nome,
      grupo: c.grupo,
      valor_previsto: prev,
      valor_realizado: r.realizado,
      valor_glosado: r.glosado,
      saldo: prev - r.realizado,
      pct: prev > 0 ? (r.realizado / prev) * 100 : 0,
      qtd: r.qtd,
    };
  });

  // Por meta
  const realizadoPorMeta = new Map<string, { valor: number; qtd: number }>();
  for (const r of (periodoRes.data ?? []) as LancRow[]) {
    if (!r.meta_id) continue;
    if (r.status === "glosado" || r.status === "cancelado") continue;
    const cur = realizadoPorMeta.get(r.meta_id) ?? { valor: 0, qtd: 0 };
    cur.valor += Number(r.valor);
    cur.qtd += 1;
    realizadoPorMeta.set(r.meta_id, cur);
  }

  const metas: MetaExecucao[] = (metasRes.data ?? []).map((m) => {
    const r = realizadoPorMeta.get(m.id) ?? { valor: 0, qtd: 0 };
    const matchObj = m.titulo.match(/^(OBJETIVO\s+\d+)/i);
    return {
      id: m.id,
      codigo: m.codigo,
      titulo: m.titulo,
      objetivo: matchObj ? matchObj[1].toUpperCase() : null,
      indicador: m.indicador,
      quantidade_prevista: m.quantidade_prevista !== null ? Number(m.quantidade_prevista) : null,
      unidade_medida: m.unidade_medida,
      valor_realizado: r.valor,
      qtd_lancamentos: r.qtd,
    };
  });

  const oscRow = pick(convRes.data.osc as { nome: string; cnpj: string; responsavel: string | null } | { nome: string; cnpj: string; responsavel: string | null }[] | null);
  const orgaoRow = pick(convRes.data.orgao as { nome: string; sigla: string | null; fundo: string | null } | { nome: string; sigla: string | null; fundo: string | null }[] | null);

  return {
    prestacao: {
      id: prestacao.id,
      tipo: prestacao.tipo,
      periodo_inicio: prestacao.periodo_inicio,
      periodo_fim: prestacao.periodo_fim,
      status: prestacao.status,
      protocolo: prestacao.protocolo,
      protocolada_em: prestacao.protocolada_em,
      analisada_em: prestacao.analisada_em,
      parecer_tecnico: prestacao.parecer_tecnico,
      glosa_total: Number(prestacao.glosa_total),
      observacoes: prestacao.observacoes,
      criado_em: prestacao.criado_em,
    },
    convenio: {
      id: convRes.data.id,
      numero: convRes.data.numero,
      tipo: convRes.data.tipo,
      objeto: convRes.data.objeto,
      publico_alvo: convRes.data.publico_alvo,
      valor_total: Number(convRes.data.valor_total),
      valor_repasse: Number(convRes.data.valor_repasse),
      valor_contrapartida: Number(convRes.data.valor_contrapartida),
      vigencia_inicio: convRes.data.vigencia_inicio,
      vigencia_fim: convRes.data.vigencia_fim,
      banco: convRes.data.banco,
      agencia: convRes.data.agencia,
      conta_corrente: convRes.data.conta_corrente,
      conta_aplicacao: convRes.data.conta_aplicacao,
      gestor_publico: convRes.data.gestor_publico,
      gestor_osc: convRes.data.gestor_osc,
    },
    osc: { nome: oscRow?.nome ?? "", cnpj: oscRow?.cnpj ?? "", responsavel: oscRow?.responsavel ?? null },
    orgao: { nome: orgaoRow?.nome ?? "", sigla: orgaoRow?.sigla ?? null, fundo: orgaoRow?.fundo ?? null },
    resumo: {
      saldo_inicial,
      total_entradas,
      total_saidas,
      rendimentos,
      saldo_final: saldo_inicial + total_entradas - total_saidas,
      glosa_total,
      qtd_lancamentos: lancamentosDetalhados.length,
    },
    rubricas,
    metas,
    conciliacao: {
      total_lancamentos: lancamentosDetalhados.length,
      conciliados,
      pendentes: lancamentosDetalhados.length - conciliados,
    },
    lancamentos: lancamentosDetalhados,
    glosados: lancamentosDetalhados.filter((l) => l.status === "glosado"),
  };
}
