"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";

function parseBR(v: FormDataEntryValue | null): number {
  if (!v) return 0;
  const s = String(v).replace(/\./g, "").replace(",", ".").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export async function salvarPlanoTrabalho(convenioId: string, formData: FormData) {
  const supabase = adminClient();

  // 1) Salvo saldo anterior carimbado
  const saldoValor   = parseBR(formData.get("saldo_anterior_valor"));
  const saldoCatId   = formData.get("saldo_anterior_categoria_id");
  const saldoOficio  = formData.get("saldo_anterior_oficio");
  const saldoConv    = formData.get("saldo_anterior_convenio");

  const updateConv: Record<string, unknown> = {
    saldo_anterior:              saldoValor,
    saldo_anterior_categoria_id: saldoCatId ? String(saldoCatId) : null,
    saldo_anterior_oficio:       saldoOficio ? String(saldoOficio) : null,
    saldo_anterior_convenio:     saldoConv ? String(saldoConv) : null,
  };
  const { error: convErr } = await supabase
    .from("caritas_convenios")
    .update(updateConv)
    .eq("id", convenioId);
  if (convErr) throw new Error(`Erro ao salvar saldo anterior: ${convErr.message}`);

  // 2) Atualizo tetos de cada rubrica (entries: cat_<id>_mensal, cat_<id>_anual, cat_<id>_tipo)
  const ids = new Set<string>();
  for (const key of formData.keys()) {
    const m = key.match(/^cat_([0-9a-f-]+)_/);
    if (m) ids.add(m[1]);
  }

  for (const id of ids) {
    const mensal = parseBR(formData.get(`cat_${id}_mensal`));
    const anual  = parseBR(formData.get(`cat_${id}_anual`));
    const tipo   = String(formData.get(`cat_${id}_tipo`) || "corrente");
    const meses  = Number(formData.get(`cat_${id}_meses`) || 12);

    const { error } = await supabase
      .from("caritas_categorias_despesa")
      .update({
        tipo_acumulo:          tipo === "provisionamento" ? "provisionamento" : "corrente",
        valor_mensal_previsto: mensal,
        valor_previsto:        anual,
        meses_cronograma:      meses,
      })
      .eq("id", id);
    if (error) throw new Error(`Erro ao atualizar rubrica ${id}: ${error.message}`);
  }

  revalidatePath(`/convenios/${convenioId}/plano-trabalho`);
  revalidatePath(`/convenios/${convenioId}/rubricas`);
  redirect(`/convenios/${convenioId}/plano-trabalho?salvo=1`);
}

/** Pré-carrega o plano da Casa da Solidariedade (TC 001/FMAS/2025) */
export async function carregarPlanoCasaSolidariedade(convenioId: string) {
  const supabase = adminClient();

  const PLANO: Array<{ codigo: string; nome: string; grupo: string; mensal: number; anual: number; tipo: "corrente" | "provisionamento" }> = [
    { codigo: "1.1", nome: "Salários e Adicionais",                grupo: "Recursos Humanos",    mensal: 6751.94, anual: 81023.28, tipo: "corrente" },
    { codigo: "1.2", nome: "Encargos Patronais e Trabalhistas",    grupo: "Recursos Humanos",    mensal: 1958.07, anual: 23496.84, tipo: "corrente" },
    { codigo: "1.3", nome: "Provisionamento",                      grupo: "Recursos Humanos",    mensal: 2504.52, anual: 30054.24, tipo: "provisionamento" },
    { codigo: "1.4", nome: "Vale Transporte",                      grupo: "Recursos Humanos",    mensal:  118.14, anual:  1417.68, tipo: "corrente" },
    { codigo: "2.1", nome: "Gêneros Alimentícios",                 grupo: "Materiais de Consumo", mensal: 1617.70, anual: 19412.40, tipo: "corrente" },
  ];

  // Pega rubricas existentes
  const { data: existentes, error: e1 } = await supabase
    .from("caritas_categorias_despesa")
    .select("id, codigo")
    .eq("convenio_id", convenioId);
  if (e1) throw new Error(`Erro ao buscar rubricas: ${e1.message}`);

  const mapaExist = new Map<string, string>(); // codigo -> id
  for (const r of existentes ?? []) mapaExist.set(r.codigo, r.id);

  for (let i = 0; i < PLANO.length; i++) {
    const p = PLANO[i];
    const dados = {
      convenio_id:           convenioId,
      codigo:                p.codigo,
      nome:                  p.nome,
      grupo:                 p.grupo,
      tipo_acumulo:          p.tipo,
      valor_mensal_previsto: p.mensal,
      valor_previsto:        p.anual,
      meses_cronograma:      12,
      ordem:                 i + 1,
      ativo:                 true,
    };
    const idExist = mapaExist.get(p.codigo);
    if (idExist) {
      const { error } = await supabase
        .from("caritas_categorias_despesa")
        .update(dados)
        .eq("id", idExist);
      if (error) throw new Error(`Erro update ${p.codigo}: ${error.message}`);
    } else {
      const { error } = await supabase
        .from("caritas_categorias_despesa")
        .insert(dados);
      if (error) throw new Error(`Erro insert ${p.codigo}: ${error.message}`);
    }
  }

  // Atualiza saldo anterior carimbado: 19.888,31 → rubrica 1.3 → ofício 79/FMAS/2026
  const { data: cat13 } = await supabase
    .from("caritas_categorias_despesa")
    .select("id")
    .eq("convenio_id", convenioId)
    .eq("codigo", "1.3")
    .maybeSingle();

  await supabase.from("caritas_convenios").update({
    saldo_anterior:              19888.31,
    saldo_anterior_categoria_id: cat13?.id ?? null,
    saldo_anterior_oficio:       "79/FMAS/2026 §8",
    saldo_anterior_convenio:     "001/FMAS/2025",
  }).eq("id", convenioId);

  revalidatePath(`/convenios/${convenioId}/plano-trabalho`);
  revalidatePath(`/convenios/${convenioId}/rubricas`);
  redirect(`/convenios/${convenioId}/plano-trabalho?carregado=1`);
}
