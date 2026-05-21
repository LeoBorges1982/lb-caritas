import { adminClient } from "@/lib/supabase/admin";

export type SeveridadeAlerta = "info" | "aviso" | "critico";

export interface Alerta {
  id: string;
  convenio_id: string;
  convenio_numero: string;
  tipo: string;
  severidade: SeveridadeAlerta;
  titulo: string;
  mensagem: string | null;
  vencimento: string | null;
  resolvido: boolean;
  resolvido_em: string | null;
  resolvido_por: string | null;
  criado_em: string;
}

export const SEVERIDADE_LABEL: Record<SeveridadeAlerta, string> = {
  info: "Informativo",
  aviso: "Aviso",
  critico: "Crítico",
};

export const SEVERIDADE_CORES: Record<SeveridadeAlerta, string> = {
  info: "bg-blue-50 border-blue-200 text-blue-700",
  aviso: "bg-amber-50 border-amber-200 text-amber-800",
  critico: "bg-red-50 border-red-200 text-red-800",
};

export const SEVERIDADE_BADGE: Record<SeveridadeAlerta, string> = {
  info: "bg-blue-100 text-blue-700 border-blue-200",
  aviso: "bg-amber-100 text-amber-800 border-amber-200",
  critico: "bg-red-100 text-red-700 border-red-200",
};

export const SEVERIDADE_ORDEM: Record<SeveridadeAlerta, number> = {
  critico: 0,
  aviso: 1,
  info: 2,
};

interface FiltrosAlertas {
  resolvido?: boolean;
  severidade?: SeveridadeAlerta;
  convenio_id?: string;
}

export async function listarAlertas(filtros: FiltrosAlertas = {}): Promise<Alerta[]> {
  const supabase = adminClient();
  let q = supabase
    .from("caritas_alertas")
    .select(`
      id, convenio_id, tipo, severidade, titulo, mensagem,
      vencimento, resolvido, resolvido_em, resolvido_por, criado_em,
      convenio:caritas_convenios ( numero )
    `)
    .order("criado_em", { ascending: false });

  if (typeof filtros.resolvido === "boolean") q = q.eq("resolvido", filtros.resolvido);
  if (filtros.severidade) q = q.eq("severidade", filtros.severidade);
  if (filtros.convenio_id) q = q.eq("convenio_id", filtros.convenio_id);

  const { data, error } = await q;
  if (error) throw new Error(`Erro ao listar alertas: ${error.message}`);

  type Row = Omit<Alerta, "convenio_numero"> & {
    convenio: { numero: string } | { numero: string }[] | null;
  };
  const pick = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  return (data as Row[] ?? []).map((r) => ({
    ...r,
    convenio_numero: pick(r.convenio)?.numero ?? "",
  }));
}
