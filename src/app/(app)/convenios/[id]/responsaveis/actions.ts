"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { getSessao } from "@/lib/sessao";

function s(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  return v === null || v === "" ? null : String(v).trim();
}

export async function atualizarResponsaveis(convenioId: string, fd: FormData) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada");

  const supabase = adminClient();

  // Convênio (campos diretos)
  const updateConv: Record<string, unknown> = {
    gestor_publico: s(fd, "gestor_publico"),
    gestor_osc: s(fd, "gestor_osc"),
    gestor_osc_cpf: s(fd, "gestor_osc_cpf"),
    responsavel_legal_nome: s(fd, "responsavel_legal_nome"),
    responsavel_legal_cpf: s(fd, "responsavel_legal_cpf"),
    elaborador_nome: s(fd, "elaborador_nome"),
    elaborador_cpf: s(fd, "elaborador_cpf"),
    contabilista_nome: s(fd, "contabilista_nome"),
    contabilista_cpf: s(fd, "contabilista_cpf"),
    contabilista_crc: s(fd, "contabilista_crc"),
    responsavel_tecnico_nome: s(fd, "responsavel_tecnico_nome"),
    responsavel_tecnico_cpf: s(fd, "responsavel_tecnico_cpf"),
    responsavel_tecnico_email: s(fd, "responsavel_tecnico_email"),
    responsavel_tecnico_funcao: s(fd, "responsavel_tecnico_funcao"),
  };

  // Valores (precisam ser consistentes: total = repasse + contrapartida)
  const parseValor = (k: string): number | null => {
    const v = s(fd, k);
    if (v === null) return null;
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const vTotal = parseValor("valor_total");
  const vRepasse = parseValor("valor_repasse");
  const vContrapartida = parseValor("valor_contrapartida");

  if (vTotal !== null || vRepasse !== null || vContrapartida !== null) {
    // Busca atuais pra completar
    const { data: atual } = await supabase
      .from("caritas_convenios")
      .select("valor_total, valor_repasse, valor_contrapartida")
      .eq("id", convenioId)
      .single();

    let total = vTotal ?? Number(atual?.valor_total ?? 0);
    let repasse = vRepasse ?? Number(atual?.valor_repasse ?? 0);
    let contrapartida = vContrapartida ?? Number(atual?.valor_contrapartida ?? 0);

    // Se mudou só total e os outros são 0 ou bate com soma antiga,
    // assume que repasse = novo total, contrapartida = 0
    if (vTotal !== null && vRepasse === null && vContrapartida === null) {
      repasse = total;
      contrapartida = 0;
    }

    // Garante consistência: ajusta total se repasse/contrapartida mudaram
    if (Math.abs(total - (repasse + contrapartida)) > 0.01) {
      total = repasse + contrapartida;
    }

    updateConv.valor_total = total;
    updateConv.valor_repasse = repasse;
    updateConv.valor_contrapartida = contrapartida;
  }

  const { data: conv, error } = await supabase
    .from("caritas_convenios")
    .update(updateConv)
    .eq("id", convenioId)
    .select("osc_id")
    .single();

  if (error) throw new Error(`Erro ao atualizar convênio: ${error.message}`);

  // OSC (email + telefone)
  const oscEmail = s(fd, "osc_email");
  const oscTelefone = s(fd, "osc_telefone");
  if (conv?.osc_id && (oscEmail !== null || oscTelefone !== null)) {
    const updOsc: Record<string, unknown> = {};
    if (oscEmail !== null) updOsc.email = oscEmail;
    if (oscTelefone !== null) updOsc.telefone = oscTelefone;
    const { error: errOsc } = await supabase.from("caritas_oscs").update(updOsc).eq("id", conv.osc_id);
    if (errOsc) throw new Error(`Erro ao atualizar OSC: ${errOsc.message}`);
  }

  revalidatePath(`/convenios/${convenioId}`);
  revalidatePath(`/convenios/${convenioId}/responsaveis`);
  revalidatePath(`/prestacoes`);
  // Force redirect pra mostrar a página atualizada
  redirect(`/convenios/${convenioId}/responsaveis?salvo=1`);
}
