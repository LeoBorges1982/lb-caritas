"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { getSessao } from "@/lib/sessao";

function parseNum(v: FormDataEntryValue | null): number {
  if (!v) return 0;
  const s = String(v).replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function parseStr(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  return v === null || v === "" ? null : String(v);
}

/** 1) Registra ofício recebido + saldos decididos */
export async function registrarOficio(convenioId: string, fd: FormData) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada");

  const supa = adminClient();

  // Calcula saldo final
  const { data: calc, error: errCalc } = await supa.rpc("caritas_calcular_encerramento", { p_convenio_id: convenioId });
  if (errCalc) throw new Error(errCalc.message);

  const valorManter = parseNum(fd.get("valor_a_manter"));
  const valorDevolver = parseNum(fd.get("valor_a_devolver"));
  const valorGlosado = parseNum(fd.get("valor_glosado"));

  const finalidadeSaldo = parseStr(fd, "finalidade_saldo");
  const rubricasStr = parseStr(fd, "rubricas_permitidas");
  const rubricasPermitidas = rubricasStr ? rubricasStr.split(",").map((s) => s.trim()).filter(Boolean) : null;

  const oficioNumero = parseStr(fd, "oficio_numero");
  const oficioData = parseStr(fd, "oficio_data");
  const oficioOrgao = parseStr(fd, "oficio_orgao");
  const oficioObs = parseStr(fd, "oficio_observacoes");

  // Upsert (1 encerramento por convênio — sempre o mais recente)
  const { data: existente } = await supa
    .from("caritas_encerramentos")
    .select("id")
    .eq("convenio_id", convenioId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    convenio_id: convenioId,
    saldo_final_calculado: calc.saldo_final,
    valor_a_manter: valorManter,
    valor_a_devolver: valorDevolver,
    valor_glosado: valorGlosado,
    finalidade_saldo: finalidadeSaldo,
    rubricas_permitidas: rubricasPermitidas,
    oficio_numero: oficioNumero,
    oficio_data: oficioData,
    oficio_orgao: oficioOrgao,
    oficio_observacoes: oficioObs,
    status: "oficio_recebido" as const,
    atualizado_em: new Date().toISOString(),
  };

  if (existente) {
    const { error } = await supa.from("caritas_encerramentos").update(payload).eq("id", existente.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supa.from("caritas_encerramentos").insert({
      ...payload,
      criado_por: sessao.sub,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/convenios/${convenioId}`);
  revalidatePath(`/convenios/${convenioId}/encerrar`);
}

/** 2) Registra a devolução como lançamento + atualiza encerramento */
export async function registrarDevolucao(convenioId: string, fd: FormData) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada");

  const supa = adminClient();
  const { data: enc, error: errEnc } = await supa
    .from("caritas_encerramentos")
    .select("*")
    .eq("convenio_id", convenioId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (errEnc) throw new Error(errEnc.message);
  if (!enc) throw new Error("Registre o ofício antes de registrar a devolução");

  const dataDev = parseStr(fd, "devolucao_data") || new Date().toISOString().slice(0, 10);
  const comprovante = parseStr(fd, "devolucao_comprovante");

  // Cria lançamento de devolução
  const { data: lanc, error: errLanc } = await supa
    .from("caritas_lancamentos")
    .insert({
      convenio_id: convenioId,
      tipo: "devolucao",
      data_lancamento: dataDev,
      data_pagamento: dataDev,
      descricao: `Devolução ao órgão — ${enc.oficio_numero || "encerramento"}`,
      valor: enc.valor_a_devolver,
      status: "realizado",
      observacoes: enc.oficio_observacoes,
      criado_por: sessao.sub,
    })
    .select("id")
    .single();
  if (errLanc) throw new Error(`Erro ao criar lançamento: ${errLanc.message}`);

  // Atualiza encerramento
  const { error: errUpd } = await supa
    .from("caritas_encerramentos")
    .update({
      devolucao_data: dataDev,
      devolucao_comprovante: comprovante,
      devolucao_lancamento_id: lanc!.id,
      status: "devolvido",
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", enc.id);
  if (errUpd) throw new Error(errUpd.message);

  revalidatePath(`/convenios/${convenioId}`);
  revalidatePath(`/convenios/${convenioId}/encerrar`);
  revalidatePath("/lancamentos");
}

/** 3) Cria convênio sucessor (prorrogação) com saldo_anterior já lançado */
export async function criarProrrogacao(convenioId: string, fd: FormData) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada");

  const supa = adminClient();

  const { data: enc } = await supa
    .from("caritas_encerramentos")
    .select("*")
    .eq("convenio_id", convenioId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!enc) throw new Error("Registre o ofício antes");

  const { data: convOrigem, error: errC } = await supa
    .from("caritas_convenios")
    .select("*")
    .eq("id", convenioId)
    .single();
  if (errC) throw new Error(errC.message);

  const novaVigInicio = parseStr(fd, "vigencia_inicio");
  const novaVigFim = parseStr(fd, "vigencia_fim");
  const aditivoNumero = parseStr(fd, "aditivo_numero");
  if (!novaVigInicio || !novaVigFim) throw new Error("Vigência obrigatória");

  // Cria novo convênio
  const { data: novo, error: errN } = await supa
    .from("caritas_convenios")
    .insert({
      numero: convOrigem.numero + (aditivoNumero ? ` (Aditivo ${aditivoNumero})` : " (Prorrogação)"),
      tipo: convOrigem.tipo,
      osc_id: convOrigem.osc_id,
      orgao_id: convOrigem.orgao_id,
      objeto: convOrigem.objeto,
      publico_alvo: convOrigem.publico_alvo,
      territorio: convOrigem.territorio,
      valor_total: convOrigem.valor_total,
      valor_repasse: convOrigem.valor_repasse,
      valor_contrapartida: convOrigem.valor_contrapartida,
      saldo_anterior: enc.valor_a_manter,
      saldo_anterior_origem: `Convênio ${convOrigem.numero} — Ofício ${enc.oficio_numero ?? "encerramento"} de ${enc.oficio_data ?? "—"}`,
      saldo_anterior_finalidade: enc.finalidade_saldo,
      saldo_anterior_rubricas_permitidas: enc.rubricas_permitidas,
      convenio_origem_id: convenioId,
      data_assinatura: novaVigInicio,
      vigencia_inicio: novaVigInicio,
      vigencia_fim: novaVigFim,
      banco: convOrigem.banco,
      agencia: convOrigem.agencia,
      conta_corrente: convOrigem.conta_corrente,
      conta_aplicacao: convOrigem.conta_aplicacao,
      gestor_publico: convOrigem.gestor_publico,
      gestor_osc: convOrigem.gestor_osc,
      status: "vigente",
    })
    .select("id")
    .single();
  if (errN) throw new Error(`Erro ao criar prorrogação: ${errN.message}`);

  // Lançamento de saldo_anterior no novo convênio
  if (enc.valor_a_manter > 0) {
    await supa.from("caritas_lancamentos").insert({
      convenio_id: novo!.id,
      tipo: "saldo_anterior",
      data_lancamento: novaVigInicio,
      data_pagamento: novaVigInicio,
      descricao: `Saldo remanescente autorizado — ${convOrigem.numero}`,
      valor: enc.valor_a_manter,
      status: "realizado",
      criado_por: sessao.sub,
    });
  }

  // Marca convênio origem como encerrado + linka sucessor
  await supa.from("caritas_convenios").update({
    status: "encerrado",
    encerrado_em: new Date().toISOString().slice(0, 10),
    encerrado_por: sessao.sub,
  }).eq("id", convenioId);

  await supa.from("caritas_encerramentos").update({
    convenio_sucessor_id: novo!.id,
    status: "renovado",
    atualizado_em: new Date().toISOString(),
  }).eq("id", enc.id);

  revalidatePath("/convenios");
  revalidatePath(`/convenios/${convenioId}`);
  redirect(`/convenios/${novo!.id}`);
}

/** 4) Finaliza encerramento sem renovação */
export async function finalizarSemRenovacao(convenioId: string) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada");

  const supa = adminClient();

  await supa.from("caritas_convenios").update({
    status: "encerrado",
    encerrado_em: new Date().toISOString().slice(0, 10),
    encerrado_por: sessao.sub,
  }).eq("id", convenioId);

  await supa.from("caritas_encerramentos").update({
    status: "finalizado",
    atualizado_em: new Date().toISOString(),
  }).eq("convenio_id", convenioId);

  revalidatePath("/convenios");
  revalidatePath(`/convenios/${convenioId}`);
  redirect("/convenios");
}
