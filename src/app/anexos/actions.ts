"use server";

import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { getSessao } from "@/lib/sessao";
import { BUCKET, gerarUrlDownload, type EntidadeAnexo } from "@/lib/anexos";

export async function uploadAnexoUniversal(formData: FormData) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const arquivo = formData.get("arquivo");
  const convenioId = formData.get("convenio_id");
  const entidade = formData.get("entidade");
  const entidadeId = formData.get("entidade_id");
  const tipo = formData.get("tipo");
  const revalidate = formData.get("revalidate");

  if (!(arquivo instanceof File)) throw new Error("Arquivo inválido.");
  if (typeof convenioId !== "string" || typeof entidade !== "string" || typeof entidadeId !== "string") {
    throw new Error("Parâmetros inválidos.");
  }
  if (arquivo.size === 0) throw new Error("Arquivo vazio.");
  if (arquivo.size > 10 * 1024 * 1024) throw new Error("Arquivo excede 10 MB.");

  const supabase = adminClient();
  const ts = Date.now();
  const nomeOriginal = arquivo.name;
  const nomeSeguro = nomeOriginal.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const caminho = `${entidade}/${entidadeId}/${ts}-${nomeSeguro}`;

  const bytes = await arquivo.arrayBuffer();
  const { error: storageErr } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, bytes, {
      contentType: arquivo.type || "application/octet-stream",
      upsert: false,
    });
  if (storageErr) throw new Error(`Erro ao subir arquivo: ${storageErr.message}`);

  const { error: dbErr } = await supabase.from("caritas_anexos").insert({
    convenio_id: convenioId,
    entidade: entidade as EntidadeAnexo,
    entidade_id: entidadeId,
    tipo: typeof tipo === "string" && tipo ? tipo : null,
    nome: nomeOriginal,
    bucket: BUCKET,
    caminho,
    mime_type: arquivo.type || null,
    tamanho_bytes: arquivo.size,
    enviado_por: sessao.sub,
  });
  if (dbErr) {
    await supabase.storage.from(BUCKET).remove([caminho]).catch(() => {});
    throw new Error(`Erro ao salvar metadados: ${dbErr.message}`);
  }

  if (typeof revalidate === "string" && revalidate) {
    revalidatePath(revalidate);
  }
}

export async function obterUrlDownloadUniversal(anexoId: string): Promise<string> {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const supabase = adminClient();
  const { data, error } = await supabase
    .from("caritas_anexos")
    .select("caminho")
    .eq("id", anexoId)
    .single();
  if (error || !data) throw new Error("Anexo não encontrado.");

  return gerarUrlDownload(data.caminho);
}

export async function deletarAnexoUniversal(anexoId: string, revalidate?: string) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const supabase = adminClient();
  const { data: anexo, error: getErr } = await supabase
    .from("caritas_anexos")
    .select("caminho")
    .eq("id", anexoId)
    .single();
  if (getErr || !anexo) throw new Error("Anexo não encontrado.");

  await supabase.storage.from(BUCKET).remove([anexo.caminho]).catch(() => {});

  const { error: dbErr } = await supabase
    .from("caritas_anexos")
    .delete()
    .eq("id", anexoId);
  if (dbErr) throw new Error(`Erro ao deletar: ${dbErr.message}`);

  if (revalidate) revalidatePath(revalidate);
}
