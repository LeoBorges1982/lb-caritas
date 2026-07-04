import { redirect } from "next/navigation";
import { getSessionUser, canPublish } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import { formatDate, TIPOS_AVISO } from "@/lib/utils";
import { PageHeader, Card, EmptyState, PrimaryLink, Badge } from "@/components/ui";
import { Plus, Pin, Trash2 } from "lucide-react";
import { togglePin, deleteAnnouncement } from "./actions";

export const dynamic = "force-dynamic";

// Público-alvo visível por perfil
const AUDIENCE_BY_ROLE: Record<string, string[]> = {
  admin: ["todos", "membros", "lideres", "tesouraria", "coordenacao"],
  tesoureiro: ["todos", "membros", "tesouraria"],
  lider: ["todos", "membros", "lideres"],
  membro: ["todos", "membros"],
};

export default async function AvisosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const db = adminClient();
  const now = new Date().toISOString();
  const audiences = AUDIENCE_BY_ROLE[user.role] ?? ["todos"];

  const { data: avisos } = await db
    .from("rcc_announcements")
    .select("*")
    .lte("publish_at", now)
    .or(`expires_at.is.null,expires_at.gte.${now}`)
    .in("target_audience", audiences)
    .order("is_pinned", { ascending: false })
    .order("publish_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <PageHeader
        title="Mural do Grupo"
        subtitle="Comunicados oficiais da coordenação"
        action={
          canPublish(user) ? (
            <PrimaryLink href="/avisos/novo">
              <Plus className="h-4 w-4" /> Novo aviso
            </PrimaryLink>
          ) : undefined
        }
      />

      {!avisos || avisos.length === 0 ? (
        <EmptyState emoji="📣" text="Nenhum aviso publicado no momento." />
      ) : (
        <div className="space-y-3">
          {avisos.map((a) => (
            <Card key={a.id} className={a.is_pinned ? "border-amber-300 bg-amber-50/50" : ""}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.is_pinned && <Pin className="h-4 w-4 text-amber-500" />}
                    <h2 className="font-semibold text-slate-800">{a.title}</h2>
                    <Badge value={a.type} label={TIPOS_AVISO[a.type] ?? a.type} />
                  </div>
                  <p className="text-sm text-slate-600 mt-1.5 whitespace-pre-wrap">{a.content}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {formatDate(a.publish_at, "dd/MM/yyyy HH:mm")}
                    {a.target_audience !== "todos" && ` · para: ${a.target_audience}`}
                  </p>
                </div>
                {user.role === "admin" && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <form action={togglePin.bind(null, a.id, !a.is_pinned)}>
                      <button
                        title={a.is_pinned ? "Desafixar" : "Fixar"}
                        className="rounded-lg p-1.5 text-slate-300 hover:bg-amber-50 hover:text-amber-600"
                      >
                        <Pin className="h-4 w-4" />
                      </button>
                    </form>
                    <form action={deleteAnnouncement.bind(null, a.id)}>
                      <button
                        title="Excluir"
                        className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
