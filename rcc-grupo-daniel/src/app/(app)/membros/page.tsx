import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, canViewMembers } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import { STATUS_MEMBRO, initials, isBirthdayToday } from "@/lib/utils";
import { PageHeader, Badge, EmptyState, PrimaryLink, Card } from "@/components/ui";
import { Plus, Upload } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MembrosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; grupo?: string; imported?: string; skipped?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !canViewMembers(user)) redirect("/dashboard");

  const { q, status, grupo, imported, skipped } = await searchParams;
  const db = adminClient();

  let query = db.from("rcc_members").select("*").order("full_name");
  if (q) query = query.ilike("full_name", `%${q}%`);
  if (status) query = query.eq("status", status);
  if (grupo) query = query.or(`cell_group.eq.${grupo},ministry.eq.${grupo}`);
  // líder vê apenas os grupos que acompanha
  if (user.role === "lider" && user.led_groups.length > 0 && !grupo) {
    query = query.or(
      user.led_groups.flatMap((g) => [`cell_group.eq.${g}`, `ministry.eq.${g}`]).join(",")
    );
  }
  const { data: members } = await query;

  const { data: groupRows } = await db.from("rcc_members").select("cell_group, ministry");
  const grupos = Array.from(
    new Set((groupRows ?? []).flatMap((r) => [r.cell_group, r.ministry]).filter(Boolean))
  ).sort() as string[];

  return (
    <div>
      <PageHeader
        title="Membros"
        subtitle={`${members?.length ?? 0} pessoa(s)`}
        action={
          user.role === "admin" ? (
            <div className="flex gap-2">
              <Link
                href="/membros/importar"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Upload className="h-4 w-4" /> Importar
              </Link>
              <PrimaryLink href="/membros/novo">
                <Plus className="h-4 w-4" /> Novo
              </PrimaryLink>
            </div>
          ) : undefined
        }
      />

      {imported && (
        <p className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-3">
          Importação concluída: {imported} membro(s) importado(s), {skipped ?? 0} ignorado(s) por
          duplicidade.
        </p>
      )}

      {/* Filtros */}
      <form className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome..."
          className="col-span-2 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white"
        />
        <select name="status" defaultValue={status ?? ""} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_MEMBRO).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <select name="grupo" defaultValue={grupo ?? ""} className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white">
            <option value="">Célula/Ministério</option>
            {grupos.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <button className="rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white">OK</button>
        </div>
      </form>

      {!members || members.length === 0 ? (
        <EmptyState emoji="👥" text="Nenhum membro encontrado com estes filtros." />
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {members.map((m) => (
              <li key={m.id}>
                <Link href={`/membros/${m.id}`} className="flex items-center gap-3 p-3.5 hover:bg-slate-50">
                  <div className="h-11 w-11 shrink-0 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-semibold text-sm">
                    {initials(m.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {m.full_name} {isBirthdayToday(m.birth_date) && "🎂"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {[m.role_in_group, m.ministry || m.cell_group].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <Badge value={m.status} label={STATUS_MEMBRO[m.status]} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
