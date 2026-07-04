import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export type Role = "admin" | "tesoureiro" | "lider" | "membro";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "pendente" | "ativo" | "bloqueado";
  member_id: string | null;
  led_groups: string[];
};

// Retorna o usuário logado com seu perfil (rcc_users). Null se não autenticado.
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const db = adminClient();
  const { data } = await db.from("rcc_users").select("*").eq("id", user.id).single();

  if (!data) {
    // Primeiro acesso: cria registro pendente (admin aprova depois)
    const name =
      (user.user_metadata?.name as string) || user.email?.split("@")[0] || "Usuário";
    const { data: created } = await db
      .from("rcc_users")
      .insert({ id: user.id, name, email: user.email, role: "membro", status: "pendente" })
      .select()
      .single();
    return created as SessionUser | null;
  }

  return data as SessionUser;
}

// -- Permissões por perfil ---------------------------------------------------

export function isAdmin(u: SessionUser) {
  return u.role === "admin";
}

// Financeiro: apenas admin e tesoureiro lançam/veem movimentações
export function canManageFinance(u: SessionUser) {
  return u.role === "admin" || u.role === "tesoureiro";
}

// Frequência: admin, tesoureiro (leitura) e líderes registram
export function canManageAttendance(u: SessionUser) {
  return u.role === "admin" || u.role === "lider";
}

// Membros: admin gerencia; líder visualiza
export function canViewMembers(u: SessionUser) {
  return u.role === "admin" || u.role === "lider" || u.role === "tesoureiro";
}

export function canManageMembers(u: SessionUser) {
  return u.role === "admin";
}

// Avisos e eventos: admin publica; líder pode publicar avisos
export function canPublish(u: SessionUser) {
  return u.role === "admin" || u.role === "lider";
}

// Exige usuário ativo com um dos perfis; lança erro caso contrário (server actions)
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new Error("Não autenticado.");
  if (u.status !== "ativo") throw new Error("Acesso pendente de aprovação da coordenação.");
  if (roles.length > 0 && !roles.includes(u.role)) {
    throw new Error("Você não tem permissão para esta ação.");
  }
  return u;
}

// Log básico de auditoria (dados financeiros e ações sensíveis)
export async function auditLog(
  userId: string,
  action: string,
  entity: string,
  entityId: string | null,
  details?: Record<string, unknown>
) {
  const db = adminClient();
  await db.from("rcc_audit_logs").insert({
    user_id: userId,
    action,
    entity,
    entity_id: entityId,
    details: details ?? null,
  });
}
