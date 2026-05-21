import { adminClient } from "@/lib/supabase/admin";

export interface Rubrica {
  id: string;
  codigo: string;
  nome: string;
  grupo: string | null;
  ordem: number;
  ativo: boolean;
  valor_previsto: number;
  valor_realizado: number;
  valor_saldo: number;
  percentual_executado: number;
  qtd_lancamentos: number;
}

export interface RubricasAgrupadas {
  grupo: string;
  rubricas: Rubrica[];
  total_previsto: number;
  total_realizado: number;
  total_saldo: number;
}

export interface RubricasResumo {
  total_previsto: number;
  total_realizado: number;
  total_saldo: number;
  percentual_executado: number;
  grupos: RubricasAgrupadas[];
}

export async function listarRubricas(convenioId: string): Promise<RubricasResumo> {
  const supabase = adminClient();

  const [catRes, lancRes] = await Promise.all([
    supabase
      .from("caritas_categorias_despesa")
      .select("id, codigo, nome, grupo, ordem, ativo, valor_previsto")
      .eq("convenio_id", convenioId)
      .order("ordem"),
    supabase
      .from("caritas_lancamentos")
      .select("categoria_id, valor, status, tipo")
      .eq("convenio_id", convenioId)
      .eq("tipo", "despesa"),
  ]);

  if (catRes.error) throw new Error(`Erro ao buscar rubricas: ${catRes.error.message}`);
  if (lancRes.error) throw new Error(`Erro ao buscar lançamentos: ${lancRes.error.message}`);

  // Agrega lançamentos por categoria (ignora cancelados; glosados não contam)
  const realizadoMap = new Map<string, { valor: number; qtd: number }>();
  for (const l of lancRes.data ?? []) {
    if (!l.categoria_id) continue;
    if (l.status === "cancelado" || l.status === "glosado") continue;
    const cur = realizadoMap.get(l.categoria_id) ?? { valor: 0, qtd: 0 };
    cur.valor += Number(l.valor);
    cur.qtd += 1;
    realizadoMap.set(l.categoria_id, cur);
  }

  // Monta rubricas
  const rubricas: Rubrica[] = (catRes.data ?? []).map((c) => {
    const prev = Number(c.valor_previsto);
    const r = realizadoMap.get(c.id) ?? { valor: 0, qtd: 0 };
    const saldo = prev - r.valor;
    const pct = prev > 0 ? (r.valor / prev) * 100 : 0;
    return {
      id: c.id,
      codigo: c.codigo,
      nome: c.nome,
      grupo: c.grupo,
      ordem: c.ordem,
      ativo: c.ativo,
      valor_previsto: prev,
      valor_realizado: r.valor,
      valor_saldo: saldo,
      percentual_executado: pct,
      qtd_lancamentos: r.qtd,
    };
  });

  // Agrupa por "grupo"
  const grupos = new Map<string, Rubrica[]>();
  for (const r of rubricas) {
    const k = r.grupo ?? "Sem grupo";
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(r);
  }

  const gruposArr: RubricasAgrupadas[] = Array.from(grupos.entries()).map(([grupo, rubs]) => ({
    grupo,
    rubricas: rubs,
    total_previsto: rubs.reduce((s, x) => s + x.valor_previsto, 0),
    total_realizado: rubs.reduce((s, x) => s + x.valor_realizado, 0),
    total_saldo: rubs.reduce((s, x) => s + x.valor_saldo, 0),
  }));

  const total_previsto = rubricas.reduce((s, r) => s + r.valor_previsto, 0);
  const total_realizado = rubricas.reduce((s, r) => s + r.valor_realizado, 0);

  return {
    total_previsto,
    total_realizado,
    total_saldo: total_previsto - total_realizado,
    percentual_executado: total_previsto > 0 ? (total_realizado / total_previsto) * 100 : 0,
    grupos: gruposArr,
  };
}
