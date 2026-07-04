import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, canViewMembers } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import { formatDate, initials, age, STATUS_MEMBRO } from "@/lib/utils";
import { PageHeader, Card, Badge, PrimaryLink } from "@/components/ui";
import { Pencil, IdCard } from "lucide-react";
import { toggleMemberStatus } from "../actions";

export const dynamic = "force-dynamic";

export default async function MembroDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !canViewMembers(user)) redirect("/dashboard");

  const { id } = await params;
  const db = adminClient();
  const { data: m } = await db.from("rcc_members").select("*").eq("id", id).single();
  if (!m) notFound();

  const { data: presencas } = await db
    .from("rcc_attendance_records")
    .select("status, rcc_attendance_meetings(title, date)")
    .eq("member_id", id)
    .order("created_at", { ascending: false })
    .limit(8);

  const info: [string, string][] = [
    ["Nascimento", m.birth_date ? `${formatDate(m.birth_date)} (${age(m.birth_date)} anos)` : "—"],
    ["Telefone", m.phone ?? "—"],
    ["WhatsApp", m.whatsapp ?? "—"],
    ["E-mail", m.email ?? "—"],
    ["Endereço", m.address ?? "—"],
    ["Estado civil", m.marital_status ?? "—"],
    ["Ministério", m.ministry ?? "—"],
    ["Célula", m.cell_group ?? "—"],
    ["Cargo/função", m.role_in_group ?? "—"],
    ["Entrada no grupo", formatDate(m.joined_at)],
    ["Termos LGPD", m.accepted_terms ? `Aceitos em ${formatDate(m.accepted_terms_at)}` : "Não registrados"],
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={m.full_name}
        subtitle="Detalhes do membro"
        action={
          user.role === "admin" ? (
            <PrimaryLink href={`/membros/${id}/editar`}>
              <Pencil className="h-4 w-4" /> Editar
            </PrimaryLink>
          ) : undefined
        }
      />

      <Card>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-blue-700 text-white flex items-center justify-center text-xl font-bold">
            {initials(m.full_name)}
          </div>
          <div>
            <Badge value={m.status} label={STATUS_MEMBRO[m.status]} />
            <p className="text-sm text-slate-500 mt-1">
              {[m.role_in_group, m.ministry || m.cell_group].filter(Boolean).join(" · ") || "Sem função definida"}
            </p>
          </div>
          <Link
            href={`/membros/${id}/cartao`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
          >
            <IdCard className="h-4 w-4" /> Cartão
          </Link>
        </div>

        <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {info.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-slate-50 pb-2">
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="text-sm font-medium text-slate-800 text-right">{value}</dd>
            </div>
          ))}
        </dl>

        {m.notes && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Observações</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{m.notes}</p>
          </div>
        )}
      </Card>

      {presencas && presencas.length > 0 && (
        <Card>
          <h2 className="font-semibold text-slate-800 mb-3">Histórico de presença</h2>
          <ul className="divide-y divide-slate-100">
            {presencas.map((p, i) => {
              const meeting = p.rcc_attendance_meetings as unknown as { title: string; date: string } | null;
              return (
                <li key={i} className="py-2 flex items-center justify-between">
                  <span className="text-sm text-slate-700">
                    {meeting?.title ?? "Reunião"} · {formatDate(meeting?.date)}
                  </span>
                  <Badge
                    value={p.status}
                    label={p.status === "present" ? "Presente" : p.status === "absent" ? "Falta" : "Justificado"}
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {user.role === "admin" && (
        <Card>
          <h2 className="font-semibold text-slate-800 mb-2">Ações administrativas</h2>
          <p className="text-xs text-slate-500 mb-3">
            Preferimos inativar em vez de excluir, preservando o histórico (LGPD).
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_MEMBRO)
              .filter(([v]) => v !== m.status)
              .map(([v, label]) => (
                <form key={v} action={toggleMemberStatus.bind(null, id, v)}>
                  <button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Marcar como {label.toLowerCase()}
                  </button>
                </form>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}
