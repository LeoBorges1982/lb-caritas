"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { getSessao } from "@/lib/sessao";
import type { TipoPrestacao, StatusPrestacao } from "@/lib/prestacoes";

export async function criarPrestacao(formData: FormData) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const convenio_id = String(formData.get("convenio_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "parcial") as TipoPrestacao;
  const periodo_inicio = String(formData.get("periodo_inicio") ?? "");
  const periodo_fim = String(formData.get("periodo_fim") ?? "");
  const observacoes = String(formData.get("observacoes") ?? "");

  if (!convenio_id) throw new Error("Convênio é obrigatório.");
  if (!periodo_inicio || !periodo_fim) throw new Error("Período é obrigatório.");
  if (periodo_fim < periodo_inicio) throw new Error("Data fim não pode ser anterior ao início.");

  const supabase = adminClient();
  const { data, error } = await supabase
    .from("caritas_prestacoes_contas")
    .insert({
      convenio_id,
      tipo,
      periodo_inicio,
      periodo_fim,
      status: "rascunho",
      observacoes: observacoes || null,
      responsavel_id: sessao.sub,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Erro ao criar prestação: ${error.message}`);

  revalidatePath("/prestacoes");
  redirect(`/prestacoes/${data!.id}`);
}

export async function atualizarStatusPrestacao(
  id: string,
  novoStatus: StatusPrestacao,
  campos?: { protocolo?: string; parecer_tecnico?: string; glosa_total?: number }
) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const update: Record<string, unknown> = { status: novoStatus };
  if (novoStatus === "protocolada") {
    update.protocolada_em = new Date().toISOString().slice(0, 10);
    if (campos?.protocolo) update.protocolo = campos.protocolo;
  }
  if (novoStatus === "aprovada" || novoStatus === "aprovada_ressalvas" || novoStatus === "rejeitada") {
    update.analisada_em = new Date().toISOString().slice(0, 10);
    if (campos?.parecer_tecnico) update.parecer_tecnico = campos.parecer_tecnico;
    if (campos?.glosa_total !== undefined) update.glosa_total = campos.glosa_total;
  }

  const supabase = adminClient();
  const { error } = await supabase
    .from("caritas_prestacoes_contas")
    .update(update)
    .eq("id", id);
  if (error) throw new Error(`Erro ao atualizar: ${error.message}`);

  revalidatePath("/prestacoes");
  revalidatePath(`/prestacoes/${id}`);
}

export async function atualizarObservacoes(id: string, observacoes: string) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const supabase = adminClient();
  const { error } = await supabase
    .from("caritas_prestacoes_contas")
    .update({ observacoes: observacoes || null })
    .eq("id", id);
  if (error) throw new Error(`Erro ao salvar: ${error.message}`);

  revalidatePath(`/prestacoes/${id}`);
}

export async function deletarPrestacao(id: string) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const supabase = adminClient();
  const { data: pc } = await supabase
    .from("caritas_prestacoes_contas")
    .select("status")
    .eq("id", id)
    .single();

  if (pc?.status !== "rascunho") {
    throw new Error("Só é possível excluir prestações em rascunho.");
  }

  const { error } = await supabase
    .from("caritas_prestacoes_contas")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`Erro ao excluir: ${error.message}`);

  revalidatePath("/prestacoes");
  redirect("/prestacoes");
}
