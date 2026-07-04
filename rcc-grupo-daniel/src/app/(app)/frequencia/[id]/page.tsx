import { notFound, redirect } from "next/navigation";
import { getSessionUser, canManageAttendance } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import { formatDate, formatTime, TIPOS_EVENTO, initials } from "@/lib/utils";
import { PageHeader, Card, SubmitButton } from "@/components/ui";
import { saveAttendance } from "../actions";

export const dynamic = "force-dynamic";

const OPTIONS = [
  { value: "present", label: "Presente", cls: "peer-checked:bg-emerald-600 peer-checked:text-white" },
  { value: "absent", label: "Falta", cls: "peer-checked:bg-rose-600 peer-checked:text-white" },
  { value: "justified", label: "Justif.", cls: "peer-checked:bg-amber-500 peer-checked:text-white" },
];

export default async function RegistroPresencaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !canManageAttendance(user)) redirect("/dashboard");

  const { id } = await params;
  const { ok } = await searchParams;
  const db = adminClient();

  const { data: meeting } = await db.from("rcc_attendance_meetings").select("*").eq("id", id).single();
  if (!meeting) notFound();

  // membros esperados: da célula da reunião (se houver) ou todos os ativos
  let membersQuery = db
    .from("rcc_members")
    .select("id, full_name, status")
    .in("status", ["ativo", "visitante"])
    .order("full_name");
  if (meeting.cell_group) {
    membersQuery = membersQuery.or(
      `cell_group.eq.${meeting.cell_group},ministry.eq.${meeting.cell_group}`
    );
  }
  const [{ data: members }, { data: records }] = await Promise.all([
    membersQuery,
    db.from("rcc_attendance_records").select("member_id, status").eq("meeting_id", id),
  ]);

  const current = new Map((records ?? []).map((r) => [r.member_id, r.status]));

  return (
    <div>
      <PageHeader
        title={meeting.title}
        subtitle={`${TIPOS_EVENTO[meeting.type] ?? meeting.type} · ${formatDate(meeting.date)}${meeting.time ? " às " + formatTime(meeting.time) : ""}${meeting.location ? " · " + meeting.location : ""}`}
      />

      {ok && (
        <p className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-3">
          Presenças salvas com sucesso! 🙌
        </p>
      )}

      <Card>
        <form action={saveAttendance.bind(null, id)} className="space-y-4">
          <ul className="divide-y divide-slate-100">
            {(members ?? []).map((m) => {
              const status = current.get(m.id);
              return (
                <li key={m.id} className="py-3 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="h-9 w-9 shrink-0 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-semibold">
                      {initials(m.full_name)}
                    </div>
                    <span className="text-sm font-medium text-slate-800 truncate">{m.full_name}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {OPTIONS.map((o) => (
                      <label key={o.value} className="cursor-pointer">
                        <input
                          type="radio"
                          name={`status_${m.id}`}
                          value={o.value}
                          defaultChecked={status === o.value}
                          className="peer sr-only"
                        />
                        <span
                          className={`inline-block rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 ${o.cls}`}
                        >
                          {o.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex items-end gap-3 flex-wrap">
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Visitantes</span>
              <input
                type="number"
                name="visitors_count"
                min={0}
                defaultValue={meeting.visitors_count}
                className="w-28 rounded-xl border border-slate-300 px-3.5 py-2.5 text-base bg-white"
              />
            </label>
            <SubmitButton>Salvar presenças</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
