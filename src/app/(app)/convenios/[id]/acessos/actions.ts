"use server";

import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { getSessao } from "@/lib/sessao";
import type { PapelAcesso } from "@/lib/acessos";

export async function adicionarAcesso(formData: FormData) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const usuario_id = String(formData.get("usuario_id") ?? "");
  const convenio_id = String(formData.get("convenio_id") ?? "");
  const papel = String(formData.get("papel") ?? "visualizador") as PapelAcesso;

  if (!usuario_id || !convenio_id) throw new Error("Usuário e convênio são obrigatórios.");

  const supabase = adminClient();
  const { error } = await supabase
    .from("caritas_usuarios_acesso")
    .insert({ usuario_id, convenio_id, papel });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Esse usuário já tem acesso ao convênio. Edite o papel em vez de adicionar.");
    }
    throw new Error(`Erro ao adicionar acesso: ${error.message}`);
  }

  revalidatePath(`/convenios/${convenio_id}/acessos`);
}

export async function atualizarPapel(id: string, papel: PapelAcesso, convenioId: string) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const supabase = adminClient();
  const { error } = await supabase
    .from("caritas_usuarios_acesso")
    .update({ papel })
    .eq("id", id);
  if (error) throw new Error(`Erro ao atualizar papel: ${error.message}`);

  revalidatePath(`/convenios/${convenioId}/acessos`);
}

export async function removerAcesso(id: string, convenioId: string) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const supabase = adminClient();
  const { error } = await supabase
    .from("caritas_usuarios_acesso")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`Erro ao remover acesso: ${error.message}`);

  revalidatePath(`/convenios/${convenioId}/acessos`);
}
