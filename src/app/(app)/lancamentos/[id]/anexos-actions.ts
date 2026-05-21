"use server";

import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { getSessao } from "@/lib/sessao";
import { BUCKET, gerarUrlDownload, type EntidadeAnexo } from "@/lib/anexos";

interface UploadParams {
  convenioId: string;
  entidade: EntidadeAnexo;
  entidadeId: string;
  tipo?: string;
}

export async function uploadAnexo(formData: FormData) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const arquivo = formData.get("arquivo");
  const convenioId = formData.get("convenio_id");
  const entidade = formData.get("entidade");
  const entidadeId = formData.get("entidade_id");
  const tipo = formData.get("tipo");

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
    entidade,
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
    // Compensa: remove arquivo se metadata falhou
    await supabase.storage.from(BUCKET).remove([caminho]).catch(() => {});
    throw new Error(`Erro ao salvar metadados: ${dbErr.message}`);
  }

  revalidatePath(`/lancamentos/${entidadeId}`);
  revalidatePath(`/convenios/${convenioId}`);
}

export async function obterUrlDownloadAnexo(anexoId: string): Promise<string> {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const supabase = adminClient();
  const { data: anexo, error } = await supabase
    .from("caritas_anexos")
    .select("caminho")
    .eq("id", anexoId)
    .single();
  if (error || !anexo) throw new Error("Anexo não encontrado.");

  return gerarUrlDownload(anexo.caminho);
}

export async function deletarAnexo(anexoId: string) {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Sessão expirada.");

  const supabase = adminClient();
  const { data: anexo, error: getErr } = await supabase
    .from("caritas_anexos")
    .select("caminho, convenio_id, entidade_id")
    .eq("id", anexoId)
    .single();
  if (getErr || !anexo) throw new Error("Anexo não encontrado.");

  await supabase.storage.from(BUCKET).remove([anexo.caminho]).catch(() => {});

  const { error: dbErr } = await supabase
    .from("caritas_anexos")
    .delete()
    .eq("id", anexoId);
  if (dbErr) throw new Error(`Erro ao deletar: ${dbErr.message}`);

  revalidatePath(`/lancamentos/${anexo.entidade_id}`);
  revalidatePath(`/convenios/${anexo.convenio_id}`);
}
