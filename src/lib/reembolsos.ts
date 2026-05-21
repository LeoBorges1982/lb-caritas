import { adminClient } from "@/lib/supabase/admin";

export type StatusReembolso = "solicitado" | "aprovado" | "pago" | "rejeitado";

export interface Reembolso {
  id: string;
  convenio_id: string;
  convenio_numero: string;
  categoria_id: string | null;
  categoria_codigo: string | null;
  categoria_nome: string | null;
  meta_id: string | null;
  meta_codigo: string | null;
  solicitante_nome: string;
  solicitante_cpf: string | null;
  descricao: string;
  data_despesa: string;
  valor: number;
  comprovante_numero: string | null;
  status: StatusReembolso;
  motivo_rejeicao: string | null;
  lancamento_id: string | null;
  aprovado_em: string | null;
  pago_em: string | null;
  observacoes: string | null;
  criado_em: string;
}

export const STATUS_REEMB_LABEL: Record<StatusReembolso, string> = {
  solicitado: "Solicitado",
  aprovado: "Aprovado",
  pago: "Pago",
  rejeitado: "Rejeitado",
};

export const STATUS_REEMB_CORES: Record<StatusReembolso, string> = {
  solicitado: "bg-amber-100 text-amber-800 border-amber-200",
  aprovado: "bg-blue-100 text-blue-700 border-blue-200",
  pago: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejeitado: "bg-red-100 text-red-700 border-red-200",
};

export async function listarReembolsos(filtros: { status?: StatusReembolso; convenio_id?: string } = {}): Promise<Reembolso[]> {
  const supabase = adminClient();
  let q = supabase
    .from("caritas_reembolsos")
    .select(`
      id, convenio_id, categoria_id, meta_id, solicitante_nome, solicitante_cpf,
      descricao, data_despesa, valor, comprovante_numero,
      status, motivo_rejeicao, lancamento_id, aprovado_em, pago_em,
      observacoes, criado_em,
      convenio:caritas_convenios ( numero ),
      categoria:caritas_categorias_despesa ( codigo, nome ),
      meta:caritas_metas ( codigo )
    `)
    .order("criado_em", { ascending: false });

  if (filtros.status) q = q.eq("status", filtros.status);
  if (filtros.convenio_id) q = q.eq("convenio_id", filtros.convenio_id);

  const { data, error } = await q;
  if (error) throw new Error(`Erro ao listar reembolsos: ${error.message}`);

  type Row = Omit<Reembolso, "convenio_numero" | "categoria_codigo" | "categoria_nome" | "meta_codigo" | "valor"> & {
    valor: number | string;
    convenio: { numero: string } | { numero: string }[] | null;
    categoria: { codigo: string; nome: string } | { codigo: string; nome: string }[] | null;
    meta: { codigo: string } | { codigo: string }[] | null;
  };
  const pick = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  return (data as Row[] ?? []).map((r) => {
    const c = pick(r.convenio);
    const cat = pick(r.categoria);
    const meta = pick(r.meta);
    return {
      ...r,
      valor: Number(r.valor),
      convenio_numero: c?.numero ?? "",
      categoria_codigo: cat?.codigo ?? null,
      categoria_nome: cat?.nome ?? null,
      meta_codigo: meta?.codigo ?? null,
    };
  });
}

export async function buscarReembolso(id: string): Promise<Reembolso | null> {
  const lista = await listarReembolsos();
  return lista.find((r) => r.id === id) ?? null;
}
