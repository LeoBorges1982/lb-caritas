import { redirect } from "next/navigation";
import { getSessionUser, canPublish } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import { formatDate, formatTime, TIPOS_EVENTO } from "@/lib/utils";
import { PageHeader, Card, EmptyState, PrimaryLink } from "@/components/ui";
import { Plus, MapPin, Clock, Trash2 } from "lucide-react";
import { deleteEvent } from "./actions";

export const dynamic = "force-dynamic";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ passados?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { passados } = await searchParams;
  const db = adminClient();
  const today = new Date().toISOString().slice(0, 10);

  const query = db.from("rcc_events").select("*");
  const { data: events } = passados
    ? await query.lt("date", today).order("date", { ascending: false }).limit(30)
    : await query.gte("date", today).order("date").limit(30);

  // agrupa por mês
  const byMonth = new Map<string, NonNullable<typeof events>>();
  for (const e of events ?? []) {
    const key = formatDate(e.date, "MMMM 'de' yyyy");
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(e);
  }

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle="Próximos encontros, retiros e formações"
        action={
          canPublish(user) ? (
            <PrimaryLink href="/agenda/novo">
              <Plus className="h-4 w-4" /> Novo evento
            </PrimaryLink>
          ) : undefined
        }
      />

      <div className="mb-4 flex gap-2 text-sm">
        <a
          href="/agenda"
          className={!passados ? "font-semibold text-blue-700" : "text-slate-500 hover:underline"}
        >
          Próximos
        </a>
        <span className="text-slate-300">·</span>
        <a
          href="/agenda?passados=1"
          className={passados ? "font-semibold text-blue-700" : "text-slate-500 hover:underline"}
        >
          Anteriores
        </a>
      </div>

      {!events || events.length === 0 ? (
        <EmptyState emoji="📅" text="Nenhum evento nesta lista." />
      ) : (
        <div className="space-y-5">
          {Array.from(byMonth.entries()).map(([month, list]) => (
            <div key={month}>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2 capitalize">
                {month}
              </h2>
              <Card className="p-0 overflow-hidden">
                <ul className="divide-y divide-slate-100">
                  {list.map((e) => (
                    <li key={e.id} className="p-4 flex gap-3">
                      <div className="shrink-0 w-14 rounded-xl bg-blue-50 border border-blue-100 text-center py-2">
                        <p className="text-lg font-bold text-blue-800 leading-none">
                          {formatDate(e.date, "dd")}
                        </p>
                        <p className="text-[10px] uppercase text-blue-600 font-semibold mt-0.5">
                          {formatDate(e.date, "EEE")}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">{e.title}</p>
                        <p className="text-xs text-slate-500">{TIPOS_EVENTO[e.type] ?? e.type}</p>
                        {e.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{e.description}</p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-500">
                          {e.start_time && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {formatTime(e.start_time)}
                              {e.end_time ? `–${formatTime(e.end_time)}` : ""}
                            </span>
                          )}
                          {e.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> {e.location}
                            </span>
                          )}
                        </div>
                      </div>
                      {user.role === "admin" && (
                        <form action={deleteEvent.bind(null, e.id)} className="shrink-0">
                          <button
                            title="Excluir evento"
                            className="rounded-lg p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
