import { adminClient } from "@/lib/supabase/admin";

export type EntidadeAnexo = "convenio" | "plano" | "meta" | "lancamento" | "balancete" | "prestacao";

export interface Anexo {
  id: string;
  convenio_id: string;
  entidade: EntidadeAnexo;
  entidade_id: string;
  tipo: string | null;
  nome: string;
  bucket: string;
  caminho: string;
  mime_type: string | null;
  tamanho_bytes: number | null;
  enviado_por: string | null;
  criado_em: string;
}

const BUCKET = "caritas-anexos";

export async function listarAnexos(entidade: EntidadeAnexo, entidadeId: string): Promise<Anexo[]> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("caritas_anexos")
    .select("*")
    .eq("entidade", entidade)
    .eq("entidade_id", entidadeId)
    .order("criado_em", { ascending: false });

  if (error) throw new Error(`Erro ao listar anexos: ${error.message}`);
  return data ?? [];
}

/** Retorna URL assinada com TTL de 60s pra download. */
export async function gerarUrlDownload(caminho: string): Promise<string> {
  const supabase = adminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(caminho, 60);
  if (error) throw new Error(`Erro ao gerar link: ${error.message}`);
  return data.signedUrl;
}

export function tipoIcone(mimeType: string | null): "pdf" | "imagem" | "documento" {
  if (!mimeType) return "documento";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "imagem";
  return "documento";
}

export function formatarTamanho(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export { BUCKET };
