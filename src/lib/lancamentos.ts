import { adminClient } from "@/lib/supabase/admin";

// ============================================================================
// Tipos
// ============================================================================

export type TipoLancamento = "repasse" | "rendimento" | "devolucao" | "despesa" | "estorno";
export type StatusLancamento = "previsto" | "realizado" | "conciliado" | "glosado" | "cancelado";
export type FormaPagamento = "pix" | "ted" | "doc" | "cheque" | "debito" | "dinheiro";
export type DocumentoTipo = "nf" | "nfse" | "recibo" | "rpa" | "folha" | "outros";
export type ContaOrigem = "corrente" | "aplicacao";

export interface Lancamento {
  id: string;
  convenio_id: string;
  convenio_numero: string;
  meta_id: string | null;
  meta_titulo: string | null;
  categoria_id: string | null;
  categoria_codigo: string | null;
  categoria_nome: string | null;
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
  status: StatusLancamento;
  conciliado_em: string | null;
  glosa_motivo: string | null;
  glosa_valor: number | null;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface FiltroLancamentos {
  convenio_id?: string;
  tipo?: TipoLancamento;
  status?: StatusLancamento;
  categoria_id?: string;
  meta_id?: string;
  mes?: string; // YYYY-MM
  busca?: string;
}

// ============================================================================
// Labels e cores
// ============================================================================

export const TIPO_LABEL: Record<TipoLancamento, string> = {
  repasse: "Repasse",
  rendimento: "Rendimento",
  devolucao: "Devolução",
  despesa: "Despesa",
  estorno: "Estorno",
};

export const TIPO_CORES: Record<TipoLancamento, string> = {
  repasse: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rendimento: "bg-teal-100 text-teal-700 border-teal-200",
  devolucao: "bg-amber-100 text-amber-700 border-amber-200",
  despesa: "bg-slate-100 text-slate-700 border-slate-200",
  estorno: "bg-orange-100 text-orange-700 border-orange-200",
};

export const TIPO_SINAL: Record<TipoLancamento, "+" | "-" | "·"> = {
  repasse: "+",
  rendimento: "+",
  devolucao: "-",
  despesa: "-",
  estorno: "·",
};

export const STATUS_LABEL: Record<StatusLancamento, string> = {
  previsto: "Previsto",
  realizado: "Realizado",
  conciliado: "Conciliado",
  glosado: "Glosado",
  cancelado: "Cancelado",
};

export const STATUS_CORES: Record<StatusLancamento, string> = {
  previsto: "bg-slate-100 text-slate-600 border-slate-200",
  realizado: "bg-blue-100 text-blue-700 border-blue-200",
  conciliado: "bg-emerald-100 text-emerald-700 border-emerald-200",
  glosado: "bg-red-100 text-red-700 border-red-200",
  cancelado: "bg-slate-100 text-slate-400 border-slate-200 line-through",
};

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  pix: "PIX",
  ted: "TED",
  doc: "DOC",
  cheque: "Cheque",
  debito: "Débito",
  dinheiro: "Dinheiro",
};

export const DOCUMENTO_TIPO_LABEL: Record<DocumentoTipo, string> = {
  nf: "Nota Fiscal",
  nfse: "NFS-e",
  recibo: "Recibo",
  rpa: "RPA",
  folha: "Folha de pagamento",
  outros: "Outros",
};

// ============================================================================
// Queries
// ============================================================================

export async function listarLancamentos(filtros: FiltroLancamentos = {}): Promise<Lancamento[]> {
  const supabase = adminClient();

  let query = supabase
    .from("caritas_lancamentos")
    .select(`
      id, convenio_id, meta_id, categoria_id,
      tipo, data_lancamento, data_pagamento, descricao, valor,
      fornecedor_nome, fornecedor_documento,
      documento_tipo, documento_numero, documento_data, documento_valor,
      forma_pagamento, conta_origem,
      status, conciliado_em, glosa_motivo, glosa_valor,
      observacoes, criado_em, atualizado_em,
      convenio:caritas_convenios ( numero ),
      meta:caritas_metas ( titulo ),
      categoria:caritas_categorias_despesa ( codigo, nome )
    `)
    .order("data_lancamento", { ascending: false })
    .order("criado_em", { ascending: false });

  if (filtros.convenio_id) query = query.eq("convenio_id", filtros.convenio_id);
  if (filtros.tipo) query = query.eq("tipo", filtros.tipo);
  if (filtros.status) query = query.eq("status", filtros.status);
  if (filtros.categoria_id) query = query.eq("categoria_id", filtros.categoria_id);
  if (filtros.meta_id) query = query.eq("meta_id", filtros.meta_id);
  if (filtros.mes) {
    const inicio = `${filtros.mes}-01`;
    const [ano, mes] = filtros.mes.split("-").map(Number);
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const fim = `${filtros.mes}-${String(ultimoDia).padStart(2, "0")}`;
    query = query.gte("data_lancamento", inicio).lte("data_lancamento", fim);
  }
  if (filtros.busca) {
    query = query.or(`descricao.ilike.%${filtros.busca}%,fornecedor_nome.ilike.%${filtros.busca}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar lançamentos: ${error.message}`);

  type Row = Omit<Lancamento, "convenio_numero" | "meta_titulo" | "categoria_codigo" | "categoria_nome" | "valor" | "documento_valor" | "glosa_valor"> & {
    valor: number | string;
    documento_valor: number | string | null;
    glosa_valor: number | string | null;
    convenio: { numero: string } | { numero: string }[] | null;
    meta: { titulo: string } | { titulo: string }[] | null;
    categoria: { codigo: string; nome: string } | { codigo: string; nome: string }[] | null;
  };

  const pick = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  return (data as Row[] ?? []).map((r) => {
    const conv = pick(r.convenio);
    const meta = pick(r.meta);
    const cat = pick(r.categoria);
    return {
      ...r,
      valor: Number(r.valor),
      documento_valor: r.documento_valor !== null ? Number(r.documento_valor) : null,
      glosa_valor: r.glosa_valor !== null ? Number(r.glosa_valor) : null,
      convenio_numero: conv?.numero ?? "",
      meta_titulo: meta?.titulo ?? null,
      categoria_codigo: cat?.codigo ?? null,
      categoria_nome: cat?.nome ?? null,
    };
  });
}

export async function buscarLancamento(id: string): Promise<Lancamento | null> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("caritas_lancamentos")
    .select(`
      *,
      convenio:caritas_convenios ( numero ),
      meta:caritas_metas ( titulo ),
      categoria:caritas_categorias_despesa ( codigo, nome )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar lançamento: ${error.message}`);
  if (!data) return null;

  const pick = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  const r = data as unknown as Lancamento & {
    convenio: { numero: string } | { numero: string }[] | null;
    meta: { titulo: string } | { titulo: string }[] | null;
    categoria: { codigo: string; nome: string } | { codigo: string; nome: string }[] | null;
  };

  return {
    ...r,
    valor: Number(r.valor),
    documento_valor: r.documento_valor !== null ? Number(r.documento_valor) : null,
    glosa_valor: r.glosa_valor !== null ? Number(r.glosa_valor) : null,
    convenio_numero: pick(r.convenio)?.numero ?? "",
    meta_titulo: pick(r.meta)?.titulo ?? null,
    categoria_codigo: pick(r.categoria)?.codigo ?? null,
    categoria_nome: pick(r.categoria)?.nome ?? null,
  };
}

export interface OpcoesFormulario {
  convenios: { id: string; numero: string }[];
  metas: { id: string; convenio_id: string; codigo: string; titulo: string }[];
  categorias: { id: string; convenio_id: string; codigo: string; nome: string }[];
}

export async function listarOpcoesFormulario(): Promise<OpcoesFormulario> {
  const supabase = adminClient();
  const [convRes, metasRes, catRes] = await Promise.all([
    supabase.from("caritas_convenios").select("id, numero").eq("status", "vigente").order("numero"),
    supabase.from("caritas_metas").select("id, convenio_id, codigo, titulo").order("ordem"),
    supabase.from("caritas_categorias_despesa").select("id, convenio_id, codigo, nome").eq("ativo", true).order("ordem"),
  ]);

  return {
    convenios: convRes.data ?? [],
    metas: metasRes.data ?? [],
    categorias: catRes.data ?? [],
  };
}

export async function listarVedacoesPorConvenio(): Promise<Record<string, Array<{ id: string; descricao: string; base_legal: string | null; ativa: boolean }>>> {
  const supabase = adminClient();
  const { data } = await supabase
    .from("caritas_vedacoes")
    .select("id, convenio_id, descricao, base_legal, ativa")
    .eq("ativa", true);

  const map: Record<string, Array<{ id: string; descricao: string; base_legal: string | null; ativa: boolean }>> = {};
  for (const v of data ?? []) {
    if (!map[v.convenio_id]) map[v.convenio_id] = [];
    map[v.convenio_id].push({
      id: v.id, descricao: v.descricao, base_legal: v.base_legal, ativa: v.ativa,
    });
  }
  return map;
}

export function tipoExigeDespesa(tipo: TipoLancamento): boolean {
  return tipo === "despesa";
}
