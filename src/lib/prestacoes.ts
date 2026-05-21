import { adminClient } from "@/lib/supabase/admin";
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
  numero_parcela: number | null;
  periodo_inicio: string;
  periodo_fim: string;
  status: StatusPrestacao;
  protocolo: string | null;
  protocolada_em: string | null;
  analisada_em: string | null;
  glosa_total: number;
  criado_em: string;
}

// ============================================================================
// Estruturas do modelo SEMAS-NI
// ============================================================================

/** Receita: A,B,C,D,E + Total */
export interface ReceitaSEMAS {
  repasses_municipais: number;       // A
  rendimentos_aplicacao: number;     // B
  recursos_osc: number;              // C
  outras_receitas: number;           // D
  saldo_periodo_anterior: number;    // E
  total: number;                     // A+B+C+D+E
}

/** Linha individual de despesa com Valor e Valor N.E. */
export interface LinhaDespesa {
  codigo: string;
  nome: string;
  valor: number;
  valor_ne: number;
}

/** Despesa estruturada 1.x, 2.x, 3.x, 4.x, 5, 6, 7 */
export interface DespesaSEMAS {
  rh: { total: number; linhas: LinhaDespesa[] };           // (1) Recursos Humanos
  materiais: { total: number; linhas: LinhaDespesa[] };    // (2) Materiais de Consumo
  servicos: { total: number; linhas: LinhaDespesa[] };     // (3) Prestação de Serviços
  locacao: { total: number; linhas: LinhaDespesa[] };      // (4) Locação
  outras: number;                                          // (5)
  outras_ne: number;
  devolvido: number;                                       // (6) Devolvido ao Município
  devolvido_ne: number;
  saldo_proximo: number;                                   // (7) Saldo p/ próximo período
  saldo_proximo_ne: number;
  total: number;
  total_ne: number;
}

/** Conciliação Bancária (Seção 3.2) */
export interface ConciliacaoBancaria {
  data_extrato: string;
  saldo_extrato: number;                  // A
  creditos_pendentes_repasses: number;   // B (parte)
  creditos_pendentes_rendimentos: number;
  creditos_pendentes_osc: number;
  creditos_pendentes_outras: number;
  total_creditos_pendentes: number;       // B
  debitos_pendentes_rh: number;          // C (parte)
  debitos_pendentes_materiais: number;
  debitos_pendentes_locacao: number;
  debitos_pendentes_servicos: number;
  debitos_pendentes_outras: number;
  total_debitos_pendentes: number;        // C
  saldo_contabil: number;                 // A+B+C
}

/** Linha da relação de pagamentos */
export interface LinhaPagamento {
  data: string;
  credor: string;
  cpf_cnpj: string | null;
  item_orcamento: string;        // ou descrição
  nf_rec: string | null;
  ob: string | null;
  valor: number;
}

/** Acompanhamento da execução financeira (Seção 4) */
export interface LinhaAcompanhamento {
  codigo: string;
  nome: string;
  previsto_mensal: number;
  executado_periodo_concedente: number;
  executado_periodo_total: number;
  previsto_acumulado: number;
  executado_acumulado_concedente: number;
  executado_acumulado_osc: number;
  executado_acumulado_total: number;
}

export interface PrestacaoConsolidada {
  prestacao: {
    id: string;
    tipo: TipoPrestacao;
    numero_parcela: number | null;
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
    valor_total: number;
    valor_repasse: number;
    valor_contrapartida: number;
    vigencia_inicio: string;
    vigencia_fim: string;
    data_assinatura: string | null;
    banco: string | null;
    agencia: string | null;
    conta_corrente: string | null;
    conta_aplicacao: string | null;
    gestor_publico: string | null;
    gestor_osc: string | null;
    gestor_osc_cpf: string | null;
    responsavel_legal_nome: string | null;
    responsavel_legal_cpf: string | null;
    elaborador_nome: string | null;
    elaborador_cpf: string | null;
    contabilista_nome: string | null;
    contabilista_cpf: string | null;
    contabilista_crc: string | null;
    responsavel_tecnico_nome: string | null;
    responsavel_tecnico_cpf: string | null;
    responsavel_tecnico_email: string | null;
    responsavel_tecnico_funcao: string | null;
    nota_empenho_numero: string | null;
    nota_empenho_valor: number | null;
  };
  osc: {
    nome: string;
    cnpj: string;
    endereco: string | null;
    cep: string | null;
    cidade: string | null;
    estado: string | null;
    telefone: string | null;
    email: string | null;
  };
  orgao: {
    nome: string;
    sigla: string | null;
    fundo: string | null;
  };
  // Seção 3.1
  receita: ReceitaSEMAS;
  despesa: DespesaSEMAS;
  // Seção 3.2
  conciliacao: ConciliacaoBancaria;
  // Seção 3.3
  pagamentos: {
    rh: LinhaPagamento[];
    materiais: LinhaPagamento[];
    servicos: LinhaPagamento[];
    locacao: LinhaPagamento[];
    outras: LinhaPagamento[];
    devolvidos: LinhaPagamento[];
    total: number;
  };
  // Seção 4
  acompanhamento: {
    linhas: LinhaAcompanhamento[];
    total_periodo: number;
    total_acumulado: number;
  };
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

// ============================================================================
// Listagem
// ============================================================================
export async function listarPrestacoes(convenioId?: string): Promise<PrestacaoListItem[]> {
  const supabase = adminClient();
  let q = supabase
    .from("caritas_prestacoes_contas")
    .select(`
      id, convenio_id, tipo, numero_parcela, periodo_inicio, periodo_fim, status,
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

// ============================================================================
// Consolidação (a peça grande)
// ============================================================================
export async function consolidarPrestacao(id: string): Promise<PrestacaoConsolidada | null> {
  const supabase = adminClient();

  const { data: prest, error } = await supabase
    .from("caritas_prestacoes_contas")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar prestação: ${error.message}`);
  if (!prest) return null;

  const convenioId: string = prest.convenio_id;
  const inicio: string = prest.periodo_inicio;
  const fim: string = prest.periodo_fim;

  const [convRes, antesRes, periodoRes, categoriasRes] = await Promise.all([
    supabase
      .from("caritas_convenios")
      .select(`
        *,
        osc:caritas_oscs (*),
        orgao:caritas_orgaos_concedentes ( nome, sigla, fundo )
      `)
      .eq("id", convenioId)
      .maybeSingle(),
    supabase
      .from("caritas_lancamentos")
      .select("tipo, valor, status")
      .eq("convenio_id", convenioId)
      .neq("status", "cancelado")
      .lt("data_lancamento", inicio),
    supabase
      .from("caritas_lancamentos")
      .select(`
        id, data_lancamento, data_pagamento, tipo, status, descricao,
        fornecedor_nome, fornecedor_documento, documento_numero, valor,
        categoria_id,
        categoria:caritas_categorias_despesa ( codigo, nome, grupo, valor_previsto )
      `)
      .eq("convenio_id", convenioId)
      .neq("status", "cancelado")
      .gte("data_lancamento", inicio)
      .lte("data_lancamento", fim)
      .order("data_lancamento"),
    supabase
      .from("caritas_categorias_despesa")
      .select("id, codigo, nome, grupo, valor_previsto, ordem")
      .eq("convenio_id", convenioId)
      .order("ordem"),
  ]);

  if (!convRes.data) return null;
  if (antesRes.error) throw new Error(antesRes.error.message);
  if (periodoRes.error) throw new Error(periodoRes.error.message);

  const pick = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  // ====== Saldo do período anterior ======
  let saldo_periodo_anterior = 0;
  for (const l of antesRes.data ?? []) {
    const v = Number(l.valor);
    if (l.tipo === "repasse" || l.tipo === "rendimento" || l.tipo === "saldo_abertura") saldo_periodo_anterior += v;
    else if (l.tipo === "despesa" && l.status !== "glosado") saldo_periodo_anterior -= v;
    else if (l.tipo === "devolucao") saldo_periodo_anterior -= v;
  }

  // ====== Receita do período (A+B+C+D) ======
  type LancRow = {
    id: string;
    data_lancamento: string;
    data_pagamento: string | null;
    tipo: TipoLancamento;
    status: StatusLancamento;
    descricao: string;
    fornecedor_nome: string | null;
    fornecedor_documento: string | null;
    documento_numero: string | null;
    valor: number | string;
    categoria_id: string | null;
    categoria: { codigo: string; nome: string; grupo: string | null; valor_previsto: number | string } | { codigo: string; nome: string; grupo: string | null; valor_previsto: number | string }[] | null;
  };
  const lancs = (periodoRes.data ?? []) as LancRow[];

  let repasses = 0, rendimentos = 0, outras_rec = 0, recursos_osc = 0;
  let saldo_abertura_periodo = 0;
  for (const l of lancs) {
    const v = Number(l.valor);
    if (l.tipo === "repasse") repasses += v;
    else if (l.tipo === "rendimento") rendimentos += v;
    else if (l.tipo === "saldo_abertura") saldo_abertura_periodo += v;
  }
  // Se houver saldo_abertura no período, soma ao "saldo do período anterior"
  const receita_E = saldo_periodo_anterior + saldo_abertura_periodo;

  const receita: ReceitaSEMAS = {
    repasses_municipais: repasses,
    rendimentos_aplicacao: rendimentos,
    recursos_osc,
    outras_receitas: outras_rec,
    saldo_periodo_anterior: receita_E,
    total: repasses + rendimentos + recursos_osc + outras_rec + receita_E,
  };

  // ====== Despesa estruturada (1.x, 2.x, 3.x, 4.x, 5, 6, 7) ======
  function despesasPorCodigo(prefix: string, codigosValidos: string[]): { total: number; linhas: LinhaDespesa[] } {
    const linhas: LinhaDespesa[] = [];
    let total = 0;
    for (const cod of codigosValidos) {
      const cat = categoriasRes.data?.find((c) => c.codigo === cod);
      if (!cat) continue;
      let valor = 0;
      for (const l of lancs) {
        if (l.tipo !== "despesa") continue;
        if (l.status === "glosado" || l.status === "cancelado") continue;
        if (l.categoria_id !== cat.id) continue;
        valor += Number(l.valor);
      }
      total += valor;
      linhas.push({
        codigo: cat.codigo,
        nome: cat.nome,
        valor,
        valor_ne: valor, // No modelo SEMAS, N.E. = Valor (igual ao executado)
      });
    }
    return { total, linhas };
  }

  const rh = despesasPorCodigo("1.", ["1.1", "1.2", "1.3", "1.4", "1.5"]);
  const materiais = despesasPorCodigo("2.", ["2.1", "2.2", "2.3", "2.4"]);
  const servicos = despesasPorCodigo("3.", ["3.1", "3.2"]);
  const locacao = despesasPorCodigo("4.", ["4.1", "4.2"]);

  let outras = 0, devolvido = 0;
  for (const l of lancs) {
    if (l.tipo === "devolucao") devolvido += Number(l.valor);
    if (l.tipo === "despesa" && !l.categoria_id && l.status !== "glosado") {
      outras += Number(l.valor);
    }
  }

  const total_despesas_periodo = rh.total + materiais.total + servicos.total + locacao.total + outras + devolvido;
  const saldo_proximo = receita.total - total_despesas_periodo;

  const despesa: DespesaSEMAS = {
    rh, materiais, servicos, locacao,
    outras, outras_ne: outras,
    devolvido, devolvido_ne: devolvido,
    saldo_proximo, saldo_proximo_ne: saldo_proximo,
    total: total_despesas_periodo + saldo_proximo,
    total_ne: total_despesas_periodo + saldo_proximo,
  };

  // ====== Conciliação bancária ======
  const conciliacao: ConciliacaoBancaria = {
    data_extrato: fim,
    saldo_extrato: saldo_proximo, // Assumindo extrato bate
    creditos_pendentes_repasses: 0,
    creditos_pendentes_rendimentos: 0,
    creditos_pendentes_osc: 0,
    creditos_pendentes_outras: 0,
    total_creditos_pendentes: 0,
    debitos_pendentes_rh: 0,
    debitos_pendentes_materiais: 0,
    debitos_pendentes_locacao: 0,
    debitos_pendentes_servicos: 0,
    debitos_pendentes_outras: 0,
    total_debitos_pendentes: 0,
    saldo_contabil: saldo_proximo,
  };

  // ====== Pagamentos por sub-seção ======
  function linhasPagamento(grupoCodigo: string): LinhaPagamento[] {
    return lancs
      .filter((l) => l.tipo === "despesa" && l.status !== "glosado" && l.status !== "cancelado")
      .filter((l) => {
        const cat = pick(l.categoria);
        return cat?.codigo?.startsWith(grupoCodigo) ?? false;
      })
      .map((l) => {
        const cat = pick(l.categoria);
        return {
          data: l.data_lancamento,
          credor: l.fornecedor_nome ?? "—",
          cpf_cnpj: l.fornecedor_documento,
          item_orcamento: cat?.nome ?? l.descricao,
          nf_rec: l.documento_numero,
          ob: null,
          valor: Number(l.valor),
        };
      });
  }

  const pagamentos = {
    rh: linhasPagamento("1."),
    materiais: linhasPagamento("2."),
    servicos: linhasPagamento("3."),
    locacao: linhasPagamento("4."),
    outras: lancs
      .filter((l) => l.tipo === "despesa" && !l.categoria_id && l.status !== "glosado")
      .map((l) => ({
        data: l.data_lancamento,
        credor: l.fornecedor_nome ?? "—",
        cpf_cnpj: l.fornecedor_documento,
        item_orcamento: l.descricao,
        nf_rec: l.documento_numero,
        ob: null,
        valor: Number(l.valor),
      })),
    devolvidos: lancs
      .filter((l) => l.tipo === "devolucao")
      .map((l) => ({
        data: l.data_lancamento,
        credor: l.fornecedor_nome ?? "Município",
        cpf_cnpj: l.fornecedor_documento,
        item_orcamento: l.descricao,
        nf_rec: l.documento_numero,
        ob: null,
        valor: Number(l.valor),
      })),
    total: total_despesas_periodo,
  };

  // ====== Acompanhamento da execução (Seção 4) ======
  // Calcula meses entre vigencia_inicio e periodo_fim pra "acumulado"
  const inicioVig = new Date(convRes.data.vigencia_inicio);
  const fimPeriodo = new Date(fim);
  const mesesAcumulados = Math.max(1,
    (fimPeriodo.getFullYear() - inicioVig.getFullYear()) * 12 +
    (fimPeriodo.getMonth() - inicioVig.getMonth()) + 1
  );

  // Busca tudo até o fim do período (incluindo período atual) pra calcular acumulado
  const { data: acumuladoRes } = await supabase
    .from("caritas_lancamentos")
    .select("tipo, valor, status, categoria_id")
    .eq("convenio_id", convenioId)
    .neq("status", "cancelado")
    .lte("data_lancamento", fim);

  const acumuladoPorCategoria = new Map<string, number>();
  for (const l of acumuladoRes ?? []) {
    if (l.tipo !== "despesa" || !l.categoria_id) continue;
    if (l.status === "glosado") continue;
    acumuladoPorCategoria.set(l.categoria_id, (acumuladoPorCategoria.get(l.categoria_id) ?? 0) + Number(l.valor));
  }

  const linhasAcomp: LinhaAcompanhamento[] = (categoriasRes.data ?? []).map((c) => {
    const previstoAnual = Number(c.valor_previsto);
    const previstoMensal = previstoAnual / 12;
    let executadoPeriodo = 0;
    for (const l of lancs) {
      if (l.tipo !== "despesa" || l.categoria_id !== c.id) continue;
      if (l.status === "glosado" || l.status === "cancelado") continue;
      executadoPeriodo += Number(l.valor);
    }
    const executadoAcumulado = acumuladoPorCategoria.get(c.id) ?? 0;
    return {
      codigo: c.codigo,
      nome: c.nome,
      previsto_mensal: previstoMensal,
      executado_periodo_concedente: executadoPeriodo,
      executado_periodo_total: executadoPeriodo,
      previsto_acumulado: previstoMensal * mesesAcumulados,
      executado_acumulado_concedente: executadoAcumulado,
      executado_acumulado_osc: 0,
      executado_acumulado_total: executadoAcumulado,
    };
  });

  const totalPeriodoAcomp = linhasAcomp.reduce((s, l) => s + l.executado_periodo_total, 0);
  const totalAcumuladoAcomp = linhasAcomp.reduce((s, l) => s + l.executado_acumulado_total, 0);

  // ====== Monta retorno ======
  const c = convRes.data;
  const oscRow = pick(c.osc as Record<string, unknown> | Record<string, unknown>[] | null) as Record<string, unknown> | null;
  const orgaoRow = pick(c.orgao as { nome: string; sigla: string | null; fundo: string | null } | { nome: string; sigla: string | null; fundo: string | null }[] | null);

  return {
    prestacao: {
      id: prest.id,
      tipo: prest.tipo,
      numero_parcela: prest.numero_parcela ?? null,
      periodo_inicio: prest.periodo_inicio,
      periodo_fim: prest.periodo_fim,
      status: prest.status,
      protocolo: prest.protocolo,
      protocolada_em: prest.protocolada_em,
      analisada_em: prest.analisada_em,
      parecer_tecnico: prest.parecer_tecnico,
      glosa_total: Number(prest.glosa_total),
      observacoes: prest.observacoes,
      criado_em: prest.criado_em,
    },
    convenio: {
      id: c.id,
      numero: c.numero,
      tipo: c.tipo,
      objeto: c.objeto,
      valor_total: Number(c.valor_total),
      valor_repasse: Number(c.valor_repasse),
      valor_contrapartida: Number(c.valor_contrapartida),
      vigencia_inicio: c.vigencia_inicio,
      vigencia_fim: c.vigencia_fim,
      data_assinatura: c.data_assinatura,
      banco: c.banco,
      agencia: c.agencia,
      conta_corrente: c.conta_corrente,
      conta_aplicacao: c.conta_aplicacao,
      gestor_publico: c.gestor_publico,
      gestor_osc: c.gestor_osc,
      gestor_osc_cpf: c.gestor_osc_cpf,
      responsavel_legal_nome: c.responsavel_legal_nome,
      responsavel_legal_cpf: c.responsavel_legal_cpf,
      elaborador_nome: c.elaborador_nome,
      elaborador_cpf: c.elaborador_cpf,
      contabilista_nome: c.contabilista_nome,
      contabilista_cpf: c.contabilista_cpf,
      contabilista_crc: c.contabilista_crc,
      responsavel_tecnico_nome: c.responsavel_tecnico_nome,
      responsavel_tecnico_cpf: c.responsavel_tecnico_cpf,
      responsavel_tecnico_email: c.responsavel_tecnico_email,
      responsavel_tecnico_funcao: c.responsavel_tecnico_funcao,
      nota_empenho_numero: c.nota_empenho_numero,
      nota_empenho_valor: c.nota_empenho_valor !== null ? Number(c.nota_empenho_valor) : null,
    },
    osc: {
      nome: String(oscRow?.nome ?? ""),
      cnpj: String(oscRow?.cnpj ?? ""),
      endereco: (oscRow?.endereco as string | null) ?? null,
      cep: (oscRow?.cep as string | null) ?? null,
      cidade: (oscRow?.cidade as string | null) ?? null,
      estado: (oscRow?.estado as string | null) ?? null,
      telefone: (oscRow?.telefone as string | null) ?? null,
      email: (oscRow?.email as string | null) ?? null,
    },
    orgao: { nome: orgaoRow?.nome ?? "", sigla: orgaoRow?.sigla ?? null, fundo: orgaoRow?.fundo ?? null },
    receita,
    despesa,
    conciliacao,
    pagamentos,
    acompanhamento: {
      linhas: linhasAcomp,
      total_periodo: totalPeriodoAcomp,
      total_acumulado: totalAcumuladoAcomp,
    },
  };
}
