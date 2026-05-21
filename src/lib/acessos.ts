import { adminClient } from "@/lib/supabase/admin";

export type PapelAcesso = "visualizador" | "operador" | "gestor";

export interface AcessoConvenio {
  id: string;
  usuario_id: string;
  convenio_id: string;
  papel: PapelAcesso;
  criado_em: string;
  // Enriquecido via join com perfis do Portal
  nome: string | null;
  email: string | null;
}

export const PAPEL_LABEL: Record<PapelAcesso, string> = {
  visualizador: "Visualizador",
  operador: "Operador",
  gestor: "Gestor",
};

export const PAPEL_DESCRICAO: Record<PapelAcesso, string> = {
  visualizador: "Apenas leitura — lançamentos, balancetes, anexos",
  operador: "Pode criar e editar lançamentos, subir anexos",
  gestor: "Acesso total — incluindo prestação de contas e edição do convênio",
};

export const PAPEL_CORES: Record<PapelAcesso, string> = {
  visualizador: "bg-slate-100 text-slate-700 border-slate-200",
  operador: "bg-blue-100 text-blue-700 border-blue-200",
  gestor: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export async function listarAcessosDoConvenio(convenioId: string): Promise<AcessoConvenio[]> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("caritas_usuarios_acesso")
    .select("id, usuario_id, convenio_id, papel, criado_em")
    .eq("convenio_id", convenioId)
    .order("criado_em");

  if (error) throw new Error(`Erro ao listar acessos: ${error.message}`);

  const userIds = (data ?? []).map((a) => a.usuario_id);
  const perfis = userIds.length > 0
    ? await buscarPerfis(userIds)
    : new Map<string, { nome: string | null; email: string | null }>();

  return (data ?? []).map((a) => {
    const p = perfis.get(a.usuario_id);
    return {
      ...a,
      nome: p?.nome ?? null,
      email: p?.email ?? null,
    };
  });
}

/** Busca os perfis (nome + email) do Portal LB. */
async function buscarPerfis(ids: string[]): Promise<Map<string, { nome: string | null; email: string | null }>> {
  const supabase = adminClient();
  const map = new Map<string, { nome: string | null; email: string | null }>();

  // Nome vem de perfis; email vem de auth.users
  const { data: perfis } = await supabase
    .from("perfis")
    .select("id, nome")
    .in("id", ids);

  // Email: precisa do schema auth — usar service_role + admin API
  const { data: { users } = { users: [] } } = await supabase.auth.admin.listUsers({ perPage: 200 });

  for (const id of ids) {
    const p = perfis?.find((x) => x.id === id);
    const u = users?.find((x) => x.id === id);
    map.set(id, {
      nome: p?.nome ?? null,
      email: u?.email ?? null,
    });
  }
  return map;
}

/** Lista todos os usuários do Portal (pra escolher quem adicionar). */
export async function listarUsuariosDoPortal(): Promise<{ id: string; nome: string | null; email: string | null }[]> {
  const supabase = adminClient();
  const { data: { users } = { users: [] } } = await supabase.auth.admin.listUsers({ perPage: 200 });
  const { data: perfis } = await supabase.from("perfis").select("id, nome");

  return (users ?? [])
    .map((u) => {
      const p = perfis?.find((x) => x.id === u.id);
      return {
        id: u.id,
        nome: p?.nome ?? null,
        email: u.email ?? null,
      };
    })
    .sort((a, b) => (a.nome ?? a.email ?? "").localeCompare(b.nome ?? b.email ?? ""));
}
