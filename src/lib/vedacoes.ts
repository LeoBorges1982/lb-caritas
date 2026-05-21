import { adminClient } from "@/lib/supabase/admin";

export interface Vedacao {
  id: string;
  descricao: string;
  base_legal: string | null;
  ativa: boolean;
}

export async function listarVedacoes(convenioId: string): Promise<Vedacao[]> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("caritas_vedacoes")
    .select("id, descricao, base_legal, ativa")
    .eq("convenio_id", convenioId)
    .eq("ativa", true)
    .order("criado_em");

  if (error) throw new Error(`Erro ao buscar vedações: ${error.message}`);
  return data ?? [];
}
