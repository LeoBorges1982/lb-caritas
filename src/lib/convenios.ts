import { adminClient } from "@/lib/supabase/admin";

export type StatusConvenio = "em_analise" | "vigente" | "suspenso" | "encerrado" | "rescindido";

export interface ConvenioListItem {
  id: string;
  numero: string;
  tipo: string;
  status: StatusConvenio;
  objeto: string;
  valor_total: number;
  saldo_atual: number | null;
  total_entradas: number;
  total_saidas: number;
  vigencia_inicio: string;
  vigencia_fim: string;
  osc_nome: string;
  orgao_sigla: string | null;
}

export interface ConvenioDetalhe {
  id: string;
  numero: string;
  tipo: string;
  status: StatusConvenio;
  objeto: string;
  publico_alvo: string | null;
  territorio: string | null;
  valor_total: number;
  valor_repasse: number;
  valor_contrapartida: number;
  rendimentos: number;
  data_assinatura: string | null;
  vigencia_inicio: string;
  vigencia_fim: string;
  banco: string | null;
  agencia: string | null;
  conta_corrente: string | null;
  conta_aplicacao: string | null;
  gestor_publico: string | null;
  gestor_osc: string | null;
  observacoes: string | null;
  osc: {
    id: string;
    nome: string;
    cnpj: string;
    cidade: string | null;
    estado: string | null;
    responsavel: string | null;
  };
  orgao: {
    id: string;
    nome: string;
    sigla: string | null;
    esfera: string;
    fundo: string | null;
  };
  saldo: {
    total_entradas: number;
    total_saidas: number;
    saldo_atual: number;
  };
  counts: {
    metas: number;
    categorias: number;
    vedacoes: number;
    lancamentos: number;
  };
}

export async function listarConvenios(): Promise<ConvenioListItem[]> {
  const supabase = adminClient();

  const { data, error } = await supabase
    .from("caritas_convenios")
    .select(`
      id, numero, tipo, status, objeto, valor_total,
      vigencia_inicio, vigencia_fim,
      osc:caritas_oscs ( nome ),
      orgao:caritas_orgaos_concedentes ( sigla )
    `)
    .order("vigencia_inicio", { ascending: false });

  if (error) throw new Error(`Erro ao listar convênios: ${error.message}`);

  const ids = (data ?? []).map((c) => c.id);
  const saldoMap = new Map<string, { saldo_atual: number; total_entradas: number; total_saidas: number }>();

  if (ids.length > 0) {
    const { data: saldos } = await supabase
      .from("caritas_v_saldo_convenio")
      .select("convenio_id, saldo_atual, total_entradas, total_saidas")
      .in("convenio_id", ids);

    for (const s of saldos ?? []) {
      saldoMap.set(s.convenio_id, {
        saldo_atual: Number(s.saldo_atual),
        total_entradas: Number(s.total_entradas),
        total_saidas: Number(s.total_saidas),
      });
    }
  }

  type Row = {
    id: string;
    numero: string;
    tipo: string;
    status: StatusConvenio;
    objeto: string;
    valor_total: number | string;
    vigencia_inicio: string;
    vigencia_fim: string;
    osc: { nome: string } | { nome: string }[] | null;
    orgao: { sigla: string | null } | { sigla: string | null }[] | null;
  };

  const pick = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  return (data as Row[] ?? []).map((c) => {
    const s = saldoMap.get(c.id);
    const osc = pick(c.osc);
    const orgao = pick(c.orgao);
    return {
      id: c.id,
      numero: c.numero,
      tipo: c.tipo,
      status: c.status,
      objeto: c.objeto,
      valor_total: Number(c.valor_total),
      saldo_atual: s?.saldo_atual ?? null,
      total_entradas: s?.total_entradas ?? 0,
      total_saidas: s?.total_saidas ?? 0,
      vigencia_inicio: c.vigencia_inicio,
      vigencia_fim: c.vigencia_fim,
      osc_nome: osc?.nome ?? "—",
      orgao_sigla: orgao?.sigla ?? null,
    };
  });
}

export async function buscarConvenio(id: string): Promise<ConvenioDetalhe | null> {
  const supabase = adminClient();

  const { data: conv, error } = await supabase
    .from("caritas_convenios")
    .select(`
      *,
      osc:caritas_oscs ( id, nome, cnpj, cidade, estado, responsavel ),
      orgao:caritas_orgaos_concedentes ( id, nome, sigla, esfera, fundo )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar convênio: ${error.message}`);
  if (!conv) return null;

  const [saldoRes, metasRes, catRes, vedRes, lancRes] = await Promise.all([
    supabase
      .from("caritas_v_saldo_convenio")
      .select("total_entradas, total_saidas, saldo_atual")
      .eq("convenio_id", id)
      .maybeSingle(),
    supabase.from("caritas_metas").select("id", { count: "exact", head: true }).eq("convenio_id", id),
    supabase.from("caritas_categorias_despesa").select("id", { count: "exact", head: true }).eq("convenio_id", id),
    supabase.from("caritas_vedacoes").select("id", { count: "exact", head: true }).eq("convenio_id", id),
    supabase.from("caritas_lancamentos").select("id", { count: "exact", head: true }).eq("convenio_id", id),
  ]);

  type OscJoin = ConvenioDetalhe["osc"];
  type OrgaoJoin = ConvenioDetalhe["orgao"];
  type ConvRow = Omit<ConvenioDetalhe, "osc" | "orgao" | "saldo" | "counts" | "valor_total" | "valor_repasse" | "valor_contrapartida" | "rendimentos"> & {
    valor_total: number | string;
    valor_repasse: number | string;
    valor_contrapartida: number | string;
    rendimentos: number | string;
    osc: OscJoin | OscJoin[] | null;
    orgao: OrgaoJoin | OrgaoJoin[] | null;
  };

  const c = conv as unknown as ConvRow;
  const pick = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  const osc = pick(c.osc) as ConvenioDetalhe["osc"];
  const orgao = pick(c.orgao) as ConvenioDetalhe["orgao"];

  return {
    id: c.id,
    numero: c.numero,
    tipo: c.tipo,
    status: c.status,
    objeto: c.objeto,
    publico_alvo: c.publico_alvo,
    territorio: c.territorio,
    valor_total: Number(c.valor_total),
    valor_repasse: Number(c.valor_repasse),
    valor_contrapartida: Number(c.valor_contrapartida),
    rendimentos: Number(c.rendimentos),
    data_assinatura: c.data_assinatura,
    vigencia_inicio: c.vigencia_inicio,
    vigencia_fim: c.vigencia_fim,
    banco: c.banco,
    agencia: c.agencia,
    conta_corrente: c.conta_corrente,
    conta_aplicacao: c.conta_aplicacao,
    gestor_publico: c.gestor_publico,
    gestor_osc: c.gestor_osc,
    observacoes: c.observacoes,
    osc,
    orgao,
    saldo: {
      total_entradas: Number(saldoRes.data?.total_entradas ?? 0),
      total_saidas: Number(saldoRes.data?.total_saidas ?? 0),
      saldo_atual: Number(saldoRes.data?.saldo_atual ?? 0),
    },
    counts: {
      metas: metasRes.count ?? 0,
      categorias: catRes.count ?? 0,
      vedacoes: vedRes.count ?? 0,
      lancamentos: lancRes.count ?? 0,
    },
  };
}

// Helpers de apresentação
export const STATUS_LABEL: Record<StatusConvenio, string> = {
  em_analise: "Em análise",
  vigente: "Vigente",
  suspenso: "Suspenso",
  encerrado: "Encerrado",
  rescindido: "Rescindido",
};

export const STATUS_CORES: Record<StatusConvenio, string> = {
  em_analise: "bg-amber-100 text-amber-700 border-amber-200",
  vigente: "bg-emerald-100 text-emerald-700 border-emerald-200",
  suspenso: "bg-orange-100 text-orange-700 border-orange-200",
  encerrado: "bg-slate-100 text-slate-600 border-slate-200",
  rescindido: "bg-red-100 text-red-700 border-red-200",
};

export const TIPO_LABEL: Record<string, string> = {
  colaboracao: "Termo de Colaboração",
  fomento: "Termo de Fomento",
  cooperacao: "Acordo de Cooperação",
};
