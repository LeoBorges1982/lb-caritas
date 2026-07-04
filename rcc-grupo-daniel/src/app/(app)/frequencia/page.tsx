import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, canManageAttendance } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import { formatDate, formatTime, TIPOS_EVENTO } from "@/lib/utils";
import { getAttendanceRate } from "@/lib/queries";
import { PageHeader, Card, EmptyState, PrimaryLink, StatCard } from "@/components/ui";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FrequenciaPage() {
  const user = await getSessionUser();
  if (!user || !canManageAttendance(user)) redirect("/dashboard");

  const db = adminClient();
  let query = db
    .from("rcc_attendance_meetings")
    .select("*, rcc_attendance_records(status)")
    .order("date", { ascending: false })
    .limit(30);
  if (user.role === "lider" && user.led_groups.length > 0) {
    query = query.or(
      ["cell_group.is.null", ...user.led_groups.map((g) => `cell_group.eq.${g}`)].join(",")
    );
  }
  const { data: meetings } = await query;
  const rate = await getAttendanceRate();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Frequência"
        subtitle="Presença em reuniões e encontros"
        action={
          <PrimaryLink href="/frequencia/nova">
            <Plus className="h-4 w-4" /> Nova reunião
          </PrimaryLink>
        }
      />

      {rate !== null && (
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <StatCard label="Frequência média" value={`${rate}%`} hint="Últimas 5 reuniões" />
        </div>
      )}

      {!meetings || meetings.length === 0 ? (
        <EmptyState emoji="📋" text="Nenhuma reunião registrada. Crie a primeira!" />
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {meetings.map((m) => {
              const records = (m.rcc_attendance_records as { status: string }[]) ?? [];
              const present = records.filter((r) => r.status === "present").length;
              return (
                <li key={m.id}>
                  <Link href={`/frequencia/${m.id}`} className="flex items-center justify-between gap-3 p-3.5 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{m.title}</p>
                      <p className="text-xs text-slate-500">
                        {TIPOS_EVENTO[m.type] ?? m.type}
                        {m.cell_group ? ` · ${m.cell_group}` : ""} · {formatDate(m.date)}
                        {m.time ? ` ${formatTime(m.time)}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-blue-800">
                        {present}/{records.length || "—"}
                      </p>
                      <p className="text-xs text-slate-400">presentes</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
