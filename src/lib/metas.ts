import { adminClient } from "@/lib/supabase/admin";

export interface Meta {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  indicador: string | null;
  meio_verificacao: string | null;
  quantidade_prevista: number | null;
  unidade_medida: string | null;
  valor_previsto: number;
  valor_realizado: number;
  data_inicio: string | null;
  data_fim: string | null;
  ordem: number;
  qtd_lancamentos: number;
  // Objetivo derivado do título (prefixo "OBJETIVO X · ...")
  objetivo: string | null;
}

export interface MetasAgrupadas {
  objetivo: string;
  metas: Meta[];
}

export interface PlanoTrabalho {
  id: string;
  versao: number;
  titulo: string | null;
  justificativa: string | null;
  metodologia: string | null;
  cronograma_resumo: string | null;
  aprovado_em: string | null;
  observacoes: string | null;
}

export interface PlanoComMetas {
  plano: PlanoTrabalho | null;
  objetivos: MetasAgrupadas[];
  total_metas: number;
}

export async function listarPlanoComMetas(convenioId: string): Promise<PlanoComMetas> {
  const supabase = adminClient();

  const [planoRes, metasRes, lancRes] = await Promise.all([
    supabase
      .from("caritas_plano_trabalho")
      .select("id, versao, titulo, justificativa, metodologia, cronograma_resumo, aprovado_em, observacoes")
      .eq("convenio_id", convenioId)
      .eq("vigente", true)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("caritas_metas")
      .select("id, codigo, titulo, descricao, indicador, meio_verificacao, quantidade_prevista, unidade_medida, valor_previsto, data_inicio, data_fim, ordem")
      .eq("convenio_id", convenioId)
      .order("ordem"),
    supabase
      .from("caritas_lancamentos")
      .select("meta_id, valor, status")
      .eq("convenio_id", convenioId),
  ]);

  if (planoRes.error) throw new Error(`Erro ao buscar plano: ${planoRes.error.message}`);
  if (metasRes.error) throw new Error(`Erro ao buscar metas: ${metasRes.error.message}`);
  if (lancRes.error) throw new Error(`Erro ao buscar lançamentos: ${lancRes.error.message}`);

  const realizadoMap = new Map<string, { valor: number; qtd: number }>();
  for (const l of lancRes.data ?? []) {
    if (!l.meta_id) continue;
    if (l.status === "cancelado" || l.status === "glosado") continue;
    const cur = realizadoMap.get(l.meta_id) ?? { valor: 0, qtd: 0 };
    cur.valor += Number(l.valor);
    cur.qtd += 1;
    realizadoMap.set(l.meta_id, cur);
  }

  const metas: Meta[] = (metasRes.data ?? []).map((m) => {
    const r = realizadoMap.get(m.id) ?? { valor: 0, qtd: 0 };
    // Extrai objetivo do título — pattern "OBJETIVO X · ..." vira "OBJETIVO X"
    const matchObj = m.titulo.match(/^(OBJETIVO\s+\d+)/i);
    return {
      id: m.id,
      codigo: m.codigo,
      titulo: m.titulo,
      descricao: m.descricao,
      indicador: m.indicador,
      meio_verificacao: m.meio_verificacao,
      quantidade_prevista: m.quantidade_prevista !== null ? Number(m.quantidade_prevista) : null,
      unidade_medida: m.unidade_medida,
      valor_previsto: Number(m.valor_previsto),
      valor_realizado: r.valor,
      data_inicio: m.data_inicio,
      data_fim: m.data_fim,
      ordem: m.ordem,
      qtd_lancamentos: r.qtd,
      objetivo: matchObj ? matchObj[1].toUpperCase() : null,
    };
  });

  // Agrupa por objetivo
  const map = new Map<string, Meta[]>();
  for (const m of metas) {
    const k = m.objetivo ?? "Sem objetivo";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(m);
  }

  const objetivos: MetasAgrupadas[] = Array.from(map.entries()).map(([objetivo, metas]) => ({
    objetivo,
    metas,
  }));

  return {
    plano: planoRes.data,
    objetivos,
    total_metas: metas.length,
  };
}
