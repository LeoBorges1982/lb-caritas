import { adminClient } from "@/lib/supabase/admin";

export type StatusEncerramento = "pendente" | "oficio_recebido" | "devolvido" | "renovado" | "finalizado";

export interface Encerramento {
  id: string;
  convenio_id: string;
  saldo_final_calculado: number;
  valor_a_manter: number;
  valor_a_devolver: number;
  valor_glosado: number;
  finalidade_saldo: string | null;
  rubricas_permitidas: string[] | null;
  oficio_numero: string | null;
  oficio_data: string | null;
  oficio_orgao: string | null;
  oficio_observacoes: string | null;
  devolucao_data: string | null;
  devolucao_comprovante: string | null;
  devolucao_lancamento_id: string | null;
  convenio_sucessor_id: string | null;
  status: StatusEncerramento;
  observacoes: string | null;
  criado_em: string;
}

export interface CalculoEncerramento {
  total_entradas: number;
  total_saidas: number;
  valor_glosado: number;
  saldo_final: number;
  despesas_previstas: number;
  despesas_realizadas: number;
  executado_menor: number;
}

export const STATUS_ENCERRAMENTO_LABEL: Record<StatusEncerramento, string> = {
  pendente:         "Pendente de ofício",
  oficio_recebido:  "Ofício recebido",
  devolvido:        "Devolução registrada",
  renovado:         "Convênio renovado",
  finalizado:       "Finalizado",
};

export const STATUS_ENCERRAMENTO_CORES: Record<StatusEncerramento, string> = {
  pendente:         "bg-slate-100 text-slate-700 border-slate-200",
  oficio_recebido:  "bg-blue-100 text-blue-800 border-blue-200",
  devolvido:        "bg-amber-100 text-amber-800 border-amber-200",
  renovado:         "bg-emerald-100 text-emerald-800 border-emerald-200",
  finalizado:       "bg-slate-200 text-slate-800 border-slate-300",
};

export async function calcularEncerramento(convenioId: string): Promise<CalculoEncerramento> {
  const supa = adminClient();
  const { data, error } = await supa.rpc("caritas_calcular_encerramento", { p_convenio_id: convenioId });
  if (error) throw new Error(`Erro ao calcular encerramento: ${error.message}`);
  return data as CalculoEncerramento;
}

export async function obterEncerramento(convenioId: string): Promise<Encerramento | null> {
  const supa = adminClient();
  const { data } = await supa
    .from("caritas_encerramentos")
    .select("*")
    .eq("convenio_id", convenioId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Encerramento) || null;
}
