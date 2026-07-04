import { redirect } from "next/navigation";
import { getSessionUser, canPublish } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import { formatDate, CATEGORIAS_ORACAO } from "@/lib/utils";
import { PageHeader, Card, EmptyState, PrimaryLink, Badge } from "@/components/ui";
import { Plus } from "lucide-react";
import { moderatePrayer } from "./actions";

export const dynamic = "force-dynamic";

export default async function OracaoPage({
  searchParams,
}: {
  searchParams: Promise<{ moderacao?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { moderacao } = await searchParams;
  const db = adminClient();
  const isModerator = canPublish(user);

  // públicos ativos/atendidos + (para moderadores) pendentes
  const { data: prayers } = await db
    .from("rcc_prayer_requests")
    .select("*, rcc_members(full_name)")
    .eq("visibility", "publico")
    .in("status", isModerator ? ["pendente", "ativo", "atendido"] : ["ativo", "atendido"])
    .order("created_at", { ascending: false })
    .limit(50);

  // meus pedidos privados
  const { data: myPrivate } = user.member_id
    ? await db
        .from("rcc_prayer_requests")
        .select("*")
        .eq("visibility", "privado")
        .eq("member_id", user.member_id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pedidos de oração"
        subtitle="Intercedamos uns pelos outros"
        action={
          <PrimaryLink href="/oracao/novo">
            <Plus className="h-4 w-4" /> Novo pedido
          </PrimaryLink>
        }
      />

      {moderacao && (
        <p className="rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm p-3">
          Seu pedido foi enviado e aguarda aprovação da coordenação antes de aparecer no mural. 🙏
        </p>
      )}

      {!prayers || prayers.length === 0 ? (
        <EmptyState emoji="🙏" text="Nenhum pedido de oração publicado." />
      ) : (
        <div className="space-y-3">
          {prayers.map((p) => (
            <Card key={p.id} className={p.status === "pendente" ? "border-amber-300" : ""}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-slate-800">{p.title}</h2>
                    <Badge value={p.category} label={CATEGORIAS_ORACAO[p.category]} />
                    {p.status !== "ativo" && (
                      <Badge
                        value={p.status}
                        label={p.status === "pendente" ? "Aguardando aprovação" : p.status === "atendido" ? "Atendido 🙌" : "Arquivado"}
                      />
                    )}
                  </div>
                  {p.description && (
                    <p className="text-sm text-slate-600 mt-1">{p.description}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1.5">
                    {(p.rcc_members as { full_name?: string } | null)?.full_name ?? "Anônimo"} ·{" "}
                    {formatDate(p.created_at)}
                  </p>
                </div>
                {isModerator && (
                  <div className="flex flex-col gap-1 shrink-0 text-xs font-semibold">
                    {p.status === "pendente" && (
                      <form action={moderatePrayer.bind(null, p.id, "ativo")}>
                        <button className="text-emerald-700 hover:underline">Aprovar</button>
                      </form>
                    )}
                    {p.status === "ativo" && (
                      <form action={moderatePrayer.bind(null, p.id, "atendido")}>
                        <button className="text-blue-700 hover:underline">Marcar atendido</button>
                      </form>
                    )}
                    {p.status !== "arquivado" && (
                      <form action={moderatePrayer.bind(null, p.id, "arquivado")}>
                        <button className="text-slate-500 hover:underline">Arquivar</button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {myPrivate && myPrivate.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Meus pedidos privados
          </h2>
          <Card className="p-0 overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {myPrivate.map((p) => (
                <li key={p.id} className="p-3.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{p.title}</p>
                    <p className="text-xs text-slate-400">{formatDate(p.created_at)}</p>
                  </div>
                  <Badge value={p.status} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
