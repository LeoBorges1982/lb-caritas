import { createHash } from "crypto";
import { adminClient } from "@/lib/supabase/admin";
import type { PrestacaoConsolidada } from "@/lib/prestacoes";

// ============================================================================
// Assinatura eletrônica avançada — Lei 14.063/2020, art. 4º, II
//
// A assinatura recai sobre o HASH DO CONTEÚDO consolidado (não sobre os bytes
// do PDF). Vantagem: o PDF pode ser reimpresso quantas vezes for, mas se algum
// lançamento do período mudar, o hash recalculado diverge do hash assinado e o
// sistema sinaliza a divergência.
// ============================================================================

export type PapelAssinatura =
  | "gestor_osc"
  | "elaborador"
  | "responsavel_legal"
  | "contabilista";

export const PAPEL_ASSINATURA_LABEL: Record<PapelAssinatura, string> = {
  gestor_osc: "Responsável da OSC (Gestor)",
  elaborador: "Responsável pela Elaboração",
  responsavel_legal: "Responsável Legal da OSC",
  contabilista: "Contabilista Responsável",
};

/** Ordem em que os papéis aparecem no documento oficial. */
export const PAPEIS_ORDEM: PapelAssinatura[] = [
  "gestor_osc",
  "elaborador",
  "responsavel_legal",
  "contabilista",
];

export interface Assinatura {
  id: string;
  convenio_id: string | null;
  entidade: string;
  entidade_id: string;
  papel: PapelAssinatura;
  nome: string;
  cpf: string | null;
  registro_profissional: string | null;
  hash_documento: string;
  algoritmo: string;
  assinado_em: string;
  assinado_por_email: string | null;
  ip: string | null;
  revogada: boolean;
}

/** Signatário previsto no convênio + estado da assinatura. */
export interface SignatarioStatus {
  papel: PapelAssinatura;
  rotulo: string;
  nome: string | null;
  cpf: string | null;
  registro: string | null;
  assinatura: Assinatura | null;
  /** true quando assinou, mas o conteúdo mudou depois */
  divergente: boolean;
}

// ----------------------------------------------------------------------------
// Hash canônico do conteúdo
// ----------------------------------------------------------------------------

/**
 * Gera o hash SHA-256 do conteúdo financeiro da prestação.
 * Determinístico: os mesmos dados produzem sempre o mesmo hash.
 */
export function calcularHashPrestacao(c: PrestacaoConsolidada): string {
  const n = (v: number) => Number(v ?? 0).toFixed(2);

  const linhasPagamento = [
    ...c.pagamentos.rh,
    ...c.pagamentos.materiais,
    ...c.pagamentos.servicos,
    ...c.pagamentos.locacao,
    ...c.pagamentos.outras,
    ...c.pagamentos.devolvidos,
  ]
    .map((l) => `${l.data}|${l.credor}|${l.cpf_cnpj ?? ""}|${n(l.valor)}`)
    .sort();

  const canonico = {
    v: 1, // versão do algoritmo canônico
    convenio: c.convenio.numero,
    cnpj_osc: c.osc.cnpj,
    tipo: c.prestacao.tipo,
    parcela: c.prestacao.numero_parcela ?? null,
    periodo: `${c.prestacao.periodo_inicio}..${c.prestacao.periodo_fim}`,
    receita: {
      a_repasses: n(c.receita.repasses_municipais),
      b_rendimentos: n(c.receita.rendimentos_aplicacao),
      c_osc: n(c.receita.recursos_osc),
      d_outras: n(c.receita.outras_receitas),
      e_saldo_anterior: n(c.receita.saldo_periodo_anterior),
      total: n(c.receita.total),
    },
    despesa: {
      rh: n(c.despesa.rh.total),
      materiais: n(c.despesa.materiais.total),
      servicos: n(c.despesa.servicos.total),
      locacao: n(c.despesa.locacao.total),
      outras: n(c.despesa.outras),
      devolvido: n(c.despesa.devolvido),
      saldo_proximo: n(c.despesa.saldo_proximo),
      total: n(c.despesa.total),
    },
    pagamentos: linhasPagamento,
  };

  return createHash("sha256").update(JSON.stringify(canonico), "utf8").digest("hex");
}

/** Formata o hash em blocos legíveis para impressão. */
export function hashLegivel(hash: string, blocos = 8): string {
  return (hash.slice(0, blocos * 4).match(/.{1,4}/g) ?? []).join(" ").toUpperCase();
}

// ----------------------------------------------------------------------------
// Consultas
// ----------------------------------------------------------------------------

export async function listarAssinaturas(
  entidade: "prestacao" | "balancete",
  entidadeId: string
): Promise<Assinatura[]> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("caritas_assinaturas")
    .select("*")
    .eq("entidade", entidade)
    .eq("entidade_id", entidadeId)
    .eq("revogada", false)
    .order("assinado_em");

  if (error) {
    // Resiliente: se a migração 006 ainda não rodou, a prestação continua
    // abrindo normalmente — apenas sem o bloco de assinaturas.
    if (tabelaInexistente(error)) return [];
    throw new Error(`Erro ao listar assinaturas: ${error.message}`);
  }
  return (data ?? []) as Assinatura[];
}

/** true quando o erro é "tabela caritas_assinaturas não existe". */
function tabelaInexistente(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "42P01" || // undefined_table (Postgres)
    error.code === "PGRST205" || // table not found in schema cache (PostgREST)
    /caritas_assinaturas/.test(error.message ?? "") &&
      /does not exist|not find|schema cache/i.test(error.message ?? "")
  );
}

/**
 * Cruza os signatários previstos no convênio com as assinaturas registradas,
 * marcando divergência quando o conteúdo mudou depois de assinado.
 */
export function montarStatusSignatarios(
  c: PrestacaoConsolidada,
  assinaturas: Assinatura[],
  hashAtual: string
): SignatarioStatus[] {
  const previstos: Record<PapelAssinatura, { nome: string | null; cpf: string | null; registro: string | null }> = {
    gestor_osc: { nome: c.convenio.gestor_osc, cpf: c.convenio.gestor_osc_cpf, registro: null },
    elaborador: { nome: c.convenio.elaborador_nome, cpf: c.convenio.elaborador_cpf, registro: null },
    responsavel_legal: { nome: c.convenio.responsavel_legal_nome, cpf: c.convenio.responsavel_legal_cpf, registro: null },
    contabilista: { nome: c.convenio.contabilista_nome, cpf: c.convenio.contabilista_cpf, registro: c.convenio.contabilista_crc },
  };

  return PAPEIS_ORDEM.map((papel) => {
    const a = assinaturas.find((x) => x.papel === papel) ?? null;
    return {
      papel,
      rotulo: PAPEL_ASSINATURA_LABEL[papel],
      nome: previstos[papel].nome,
      cpf: previstos[papel].cpf,
      registro: previstos[papel].registro,
      assinatura: a,
      divergente: !!a && a.hash_documento !== hashAtual,
    };
  });
}

export interface ResumoAssinaturas {
  total: number;
  assinadas: number;
  divergentes: number;
  completo: boolean;
  integro: boolean;
}

export function resumirAssinaturas(status: SignatarioStatus[]): ResumoAssinaturas {
  const assinadas = status.filter((s) => s.assinatura).length;
  const divergentes = status.filter((s) => s.divergente).length;
  return {
    total: status.length,
    assinadas,
    divergentes,
    completo: assinadas === status.length,
    integro: divergentes === 0,
  };
}
