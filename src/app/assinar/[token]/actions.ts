"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { adminClient } from "@/lib/supabase/admin";
import { consolidarPrestacao } from "@/lib/prestacoes";
import { calcularHashPrestacao } from "@/lib/assinaturas";
import {
  buscarConvitePorToken,
  motivoInvalido,
  MOTIVO_LABEL,
  cpfConfere,
  MAX_TENTATIVAS,
} from "@/lib/convites";

export interface ResultadoAssinatura {
  ok: boolean;
  erro?: string;
  tentativasRestantes?: number;
}

/**
 * Assinatura feita pelo link, SEM login.
 *
 * A identidade é conferida pelo CPF cadastrado no convênio. Toda a validação
 * roda aqui no servidor: o cliente não decide nada.
 */
export async function assinarPorConvite(
  token: string,
  cpfInformado: string,
  aceite: boolean
): Promise<ResultadoAssinatura> {
  if (!aceite) {
    return { ok: false, erro: "É preciso marcar a declaração para assinar." };
  }

  const convite = await buscarConvitePorToken(token);
  if (!convite) {
    return { ok: false, erro: "Link inválido." };
  }

  const c = await consolidarPrestacao(convite.entidade_id);
  if (!c) {
    return { ok: false, erro: "Documento não encontrado." };
  }

  const hashAtual = calcularHashPrestacao(c);
  const agora = new Date().toISOString();

  const invalido = motivoInvalido(convite, hashAtual, agora);
  if (invalido) {
    return { ok: false, erro: MOTIVO_LABEL[invalido] };
  }

  const supabase = adminClient();

  // CPF errado: conta a tentativa e não diz qual é o certo
  if (!cpfConfere(cpfInformado, convite.cpf)) {
    const tentativas = convite.tentativas + 1;
    await supabase
      .from("caritas_convites_assinatura")
      .update({ tentativas })
      .eq("id", convite.id);

    const restantes = MAX_TENTATIVAS - tentativas;
    return {
      ok: false,
      erro:
        restantes > 0
          ? "CPF não confere com o cadastrado para este signatário."
          : "CPF incorreto. Link bloqueado por segurança — peça um novo a quem lhe enviou.",
      tentativasRestantes: Math.max(0, restantes),
    };
  }

  const h = await headers();
  const ip =
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    h.get("x-real-ip") ??
    null;
  const userAgent = h.get("user-agent") ?? null;

  const { data: assinatura, error } = await supabase
    .from("caritas_assinaturas")
    .insert({
      convenio_id: convite.convenio_id,
      entidade: convite.entidade,
      entidade_id: convite.entidade_id,
      papel: convite.papel,
      nome: convite.nome,
      cpf: convite.cpf,
      registro_profissional: convite.registro_profissional,
      hash_documento: hashAtual,
      algoritmo: "SHA-256",
      assinado_por_email: null, // assinou pelo link, não por login
      ip,
      user_agent: userAgent,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, erro: "Este papel já foi assinado neste documento." };
    }
    return { ok: false, erro: `Erro ao registrar assinatura: ${error.message}` };
  }

  await supabase
    .from("caritas_convites_assinatura")
    .update({ usado_em: agora, assinatura_id: assinatura.id })
    .eq("id", convite.id);

  revalidatePath(`/assinar/${token}`);
  revalidatePath(`/prestacoes/${convite.entidade_id}`);
  revalidatePath(`/imprimir/prestacao/${convite.entidade_id}`);
  revalidatePath(`/verificar/${convite.entidade_id}`);

  return { ok: true };
}
