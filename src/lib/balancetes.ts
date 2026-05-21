import { adminClient } from "@/lib/supabase/admin";
import type { TipoLancamento, StatusLancamento } from "@/lib/lancamentos";

export interface LancamentoBalancete {
  id: string;
  data_lancamento: string;
  data_pagamento: string | null;
  tipo: TipoLancamento;
  status: StatusLancamento;
  descricao: string;
  fornecedor_nome: string | null;
  documento_numero: string | null;
  valor: number;
  categoria_codigo: string | null;
  categoria_nome: string | null;
  meta_codigo: string | null;
}

export interface LinhaCategoria {
  categoria_codigo: string | null;
  categoria_nome: string | null;
  total: number;
  qtd: number;
}

export interface MesBalancete {
  mes: string; // YYYY-MM
  total_entradas: number;
  total_saidas: number;
  rendimentos: number;
  saldo_movimento: number;
  qtd_lancamentos: number;
}

export interface BalanceteMensal {
  convenio: {
    id: string;
    numero: string;
    objeto: string;
    osc_nome: string;
    orgao_sigla: string | null;
  };
  mes: string;
  mesLabel: string;
  saldo_inicial: number;
  total_entradas: number;
  total_saidas: number;
  rendimentos: number;
  saldo_final: number;
  qtd_lancamentos: number;
  por_categoria: LinhaCategoria[];
  lancamentos: LancamentoBalancete[];
}

const MESES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function rangeMes(mes: string): { inicio: string; fim: string } {
  const [ano, m] = mes.split("-").map(Number);
  const inicio = `${mes}-01`;
  const ultimoDia = new Date(ano, m, 0).getDate();
  const fim = `${mes}-${String(ultimoDia).padStart(2, "0")}`;
  return { inicio, fim };
}

function mesLabel(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  return `${MESES_PT[m - 1]} de ${ano}`;
}

/** Lista todos os meses que tiveram movimentação para um convênio. */
export async function listarMesesComMovimento(convenioId: string): Promise<MesBalancete[]> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("caritas_lancamentos")
    .select("data_lancamento, tipo, valor, status")
    .eq("convenio_id", convenioId)
    .neq("status", "cancelado")
    .order("data_lancamento", { ascending: false });

  if (error) throw new Error(`Erro ao buscar movimento: ${error.message}`);

  const map = new Map<string, MesBalancete>();
  for (const l of data ?? []) {
    const mes = l.data_lancamento.slice(0, 7);
    const cur = map.get(mes) ?? {
      mes,
      total_entradas: 0,
      total_saidas: 0,
      rendimentos: 0,
      saldo_movimento: 0,
      qtd_lancamentos: 0,
    };
    const v = Number(l.valor);
    cur.qtd_lancamentos += 1;
    if (l.tipo === "repasse") cur.total_entradas += v;
    else if (l.tipo === "rendimento") {
      cur.total_entradas += v;
      cur.rendimentos += v;
    } else if (l.tipo === "despesa" && l.status !== "glosado") {
      cur.total_saidas += v;
    } else if (l.tipo === "devolucao") {
      cur.total_saidas += v;
    }
    cur.saldo_movimento = cur.total_entradas - cur.total_saidas;
    map.set(mes, cur);
  }

  return Array.from(map.values()).sort((a, b) => b.mes.localeCompare(a.mes));
}

export async function gerarBalanceteMensal(convenioId: string, mes: string): Promise<BalanceteMensal | null> {
  const supabase = adminClient();
  const { inicio, fim } = rangeMes(mes);

  const [convRes, antesRes, mesRes] = await Promise.all([
    supabase
      .from("caritas_convenios")
      .select(`
        id, numero, objeto,
        osc:caritas_oscs ( nome ),
        orgao:caritas_orgaos_concedentes ( sigla )
      `)
      .eq("id", convenioId)
      .maybeSingle(),
    // Saldo antes do mês
    supabase
      .from("caritas_lancamentos")
      .select("tipo, valor, status")
      .eq("convenio_id", convenioId)
      .neq("status", "cancelado")
      .lt("data_lancamento", inicio),
    // Lançamentos do mês com joins
    supabase
      .from("caritas_lancamentos")
      .select(`
        id, data_lancamento, data_pagamento, tipo, status, descricao,
        fornecedor_nome, documento_numero, valor,
        categoria:caritas_categorias_despesa ( codigo, nome ),
        meta:caritas_metas ( codigo )
      `)
      .eq("convenio_id", convenioId)
      .neq("status", "cancelado")
      .gte("data_lancamento", inicio)
      .lte("data_lancamento", fim)
      .order("data_lancamento"),
  ]);

  if (convRes.error) throw new Error(`Erro ao buscar convênio: ${convRes.error.message}`);
  if (!convRes.data) return null;
  if (antesRes.error) throw new Error(`Erro ao apurar saldo: ${antesRes.error.message}`);
  if (mesRes.error) throw new Error(`Erro ao buscar lançamentos: ${mesRes.error.message}`);

  // Saldo inicial = entradas - saídas antes do mês
  let saldo_inicial = 0;
  for (const l of antesRes.data ?? []) {
    const v = Number(l.valor);
    if (l.tipo === "repasse" || l.tipo === "rendimento") saldo_inicial += v;
    else if (l.tipo === "despesa" && l.status !== "glosado") saldo_inicial -= v;
    else if (l.tipo === "devolucao") saldo_inicial -= v;
  }

  let total_entradas = 0;
  let total_saidas = 0;
  let rendimentos = 0;

  const pick = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

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
    categoria: { codigo: string; nome: string } | { codigo: string; nome: string }[] | null;
    meta: { codigo: string } | { codigo: string }[] | null;
  };

  const lancamentos: LancamentoBalancete[] = ((mesRes.data ?? []) as LancRow[]).map((r) => {
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

    const cat = pick(r.categoria);
    const meta = pick(r.meta);

    return {
      id: r.id,
      data_lancamento: r.data_lancamento,
      data_pagamento: r.data_pagamento,
      tipo: r.tipo,
      status: r.status,
      descricao: r.descricao,
      fornecedor_nome: r.fornecedor_nome,
      documento_numero: r.documento_numero,
      valor: v,
      categoria_codigo: cat?.codigo ?? null,
      categoria_nome: cat?.nome ?? null,
      meta_codigo: meta?.codigo ?? null,
    };
  });

  // Agrega por categoria (despesas e devoluções)
  const catMap = new Map<string, LinhaCategoria>();
  for (const l of lancamentos) {
    if (l.tipo !== "despesa" || l.status === "glosado") continue;
    const key = l.categoria_codigo ?? "—";
    const cur = catMap.get(key) ?? {
      categoria_codigo: l.categoria_codigo,
      categoria_nome: l.categoria_nome,
      total: 0,
      qtd: 0,
    };
    cur.total += l.valor;
    cur.qtd += 1;
    catMap.set(key, cur);
  }
  const por_categoria = Array.from(catMap.values()).sort((a, b) =>
    (a.categoria_codigo ?? "").localeCompare(b.categoria_codigo ?? "")
  );

  const oscJoin = pick(convRes.data.osc as { nome: string } | { nome: string }[] | null);
  const orgaoJoin = pick(convRes.data.orgao as { sigla: string | null } | { sigla: string | null }[] | null);

  return {
    convenio: {
      id: convRes.data.id,
      numero: convRes.data.numero,
      objeto: convRes.data.objeto,
      osc_nome: oscJoin?.nome ?? "",
      orgao_sigla: orgaoJoin?.sigla ?? null,
    },
    mes,
    mesLabel: mesLabel(mes),
    saldo_inicial,
    total_entradas,
    total_saidas,
    rendimentos,
    saldo_final: saldo_inicial + total_entradas - total_saidas,
    qtd_lancamentos: lancamentos.length,
    por_categoria,
    lancamentos,
  };
}

export async function listarConveniosParaBalancete(): Promise<{ id: string; numero: string }[]> {
  const supabase = adminClient();
  const { data } = await supabase
    .from("caritas_convenios")
    .select("id, numero")
    .order("numero");
  return data ?? [];
}

export { mesLabel };
