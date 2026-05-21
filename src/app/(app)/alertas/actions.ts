"use server";

import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { getSessao } from "@/lib/sessao";

export async function resolverAlerta(id: string) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const supabase = adminClient();
  const { error } = await supabase
    .from("caritas_alertas")
    .update({
      resolvido: true,
      resolvido_em: new Date().toISOString(),
      resolvido_por: sessao.sub,
    })
    .eq("id", id);

  if (error) throw new Error(`Erro ao resolver alerta: ${error.message}`);
  revalidatePath("/alertas");
  revalidatePath("/dashboard");
}

export async function reabrirAlerta(id: string) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const supabase = adminClient();
  const { error } = await supabase
    .from("caritas_alertas")
    .update({ resolvido: false, resolvido_em: null, resolvido_por: null })
    .eq("id", id);

  if (error) throw new Error(`Erro ao reabrir alerta: ${error.message}`);
  revalidatePath("/alertas");
  revalidatePath("/dashboard");
}
