import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import {
  getFinanceSummary,
  getMembersSummary,
  getUpcomingEvents,
  getRecentAnnouncements,
  getAttendanceRate,
} from "@/lib/queries";
import { adminClient } from "@/lib/supabase/admin";
import { formatBRL, formatDate, formatTime, TIPOS_EVENTO } from "@/lib/utils";
import { Card, StatCard, PageHeader, Badge } from "@/components/ui";
import { QrCode, Plus, IdCard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const isFinance = user.role === "admin" || user.role === "tesoureiro";
  const isLeader = user.role === "admin" || user.role === "lider";

  const [finance, members, events, announcements, attendance] = await Promise.all([
    isFinance ? getFinanceSummary() : Promise.resolve(null),
    isLeader || isFinance ? getMembersSummary() : Promise.resolve(null),
    getUpcomingEvents(4),
    getRecentAnnouncements(3),
    isLeader ? getAttendanceRate() : Promise.resolve(null),
  ]);

  // Últimas movimentações (tesoureiro/admin)
  let lastTransactions: Record<string, unknown>[] = [];
  if (isFinance) {
    const db = adminClient();
    const { data } = await db
      .from("rcc_financial_transactions")
      .select("id, type, category, amount, date, status, description")
      .order("date", { ascending: false })
      .limit(5);
    lastTransactions = data ?? [];
  }

  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`A paz de Cristo, ${firstName}! 🙏`}
        subtitle={formatDate(new Date(), "EEEE, dd 'de' MMMM")}
      />

      {/* Ações rápidas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link
          href="/pix/contribuir"
          className="flex items-center gap-2 rounded-2xl bg-blue-700 p-4 text-white font-semibold text-sm hover:bg-blue-800"
        >
          <QrCode className="h-5 w-5" /> Contribuir via PIX
        </Link>
        {isFinance && (
          <>
            <Link
              href="/financeiro/nova-receita"
              className="flex items-center gap-2 rounded-2xl bg-emerald-600 p-4 text-white font-semibold text-sm hover:bg-emerald-700"
            >
              <Plus className="h-5 w-5" /> Nova receita
            </Link>
            <Link
              href="/financeiro/nova-despesa"
              className="flex items-center gap-2 rounded-2xl bg-rose-600 p-4 text-white font-semibold text-sm hover:bg-rose-700"
            >
              <Plus className="h-5 w-5" /> Nova despesa
            </Link>
          </>
        )}
        {user.member_id && (
          <Link
            href="/perfil/cartao"
            className="flex items-center gap-2 rounded-2xl bg-amber-500 p-4 text-white font-semibold text-sm hover:bg-amber-600"
          >
            <IdCard className="h-5 w-5" /> Cartão de membro
          </Link>
        )}
      </div>

      {/* Métricas financeiras */}
      {finance && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Saldo em caixa" value={formatBRL(finance.saldo)} tone={finance.saldo >= 0 ? "green" : "red"} hint="Receitas confirmadas − despesas pagas" />
          <StatCard label="Receitas do mês" value={formatBRL(finance.receitasMes)} tone="green" />
          <StatCard label="Despesas do mês" value={formatBRL(finance.despesasMes)} tone="red" />
          <StatCard label="Doações PIX no mês" value={formatBRL(finance.doacoesPixMes)} tone="gold" hint={finance.pendencias > 0 ? `${finance.pendencias} lançamento(s) pendente(s)` : undefined} />
        </div>
      )}

      {/* Métricas pastorais */}
      {members && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Membros cadastrados" value={members.total} />
          <StatCard label="Membros ativos" value={members.ativos} tone="green" />
          <StatCard label="Aniversariantes do mês" value={members.aniversariantes.length} tone="gold" />
          {attendance !== null && (
            <StatCard label="Frequência média" value={`${attendance}%`} hint="Últimas reuniões" />
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Próximos encontros */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">Próximos encontros</h2>
            <Link href="/agenda" className="text-sm text-blue-700 hover:underline">
              Ver agenda
            </Link>
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum evento programado.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {events.map((e) => (
                <li key={e.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{e.title}</p>
                    <p className="text-xs text-slate-500">
                      {TIPOS_EVENTO[e.type] ?? e.type}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-blue-800">{formatDate(e.date, "dd/MM")}</p>
                    <p className="text-xs text-slate-500">{formatTime(e.start_time)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Mural */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">Mural do Grupo</h2>
            <Link href="/avisos" className="text-sm text-blue-700 hover:underline">
              Ver todos
            </Link>
          </div>
          {announcements.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum aviso publicado.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {announcements.map((a) => (
                <li key={a.id} className="py-2.5">
                  <p className="text-sm font-medium text-slate-800">
                    {a.is_pinned && "📌 "}
                    {a.title}
                  </p>
                  <p className="text-xs text-slate-500 line-clamp-2">{a.content}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Aniversariantes do mês */}
        {members && members.aniversariantes.length > 0 && (
          <Card>
            <h2 className="font-semibold text-slate-800 mb-3">🎂 Aniversariantes do mês</h2>
            <ul className="divide-y divide-slate-100">
              {members.aniversariantes.slice(0, 6).map((m) => (
                <li key={m.id} className="py-2 flex items-center justify-between">
                  <span className="text-sm text-slate-700">{m.full_name}</span>
                  <span className="text-sm font-semibold text-amber-600">
                    {formatDate(m.birth_date, "dd/MM")}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Últimas movimentações */}
        {isFinance && lastTransactions.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800">Últimas movimentações</h2>
              <Link href="/financeiro" className="text-sm text-blue-700 hover:underline">
                Ver financeiro
              </Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {lastTransactions.map((t) => (
                <li key={String(t.id)} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 truncate">{String(t.description || t.category)}</p>
                    <Badge value={String(t.status)} />
                  </div>
                  <span
                    className={
                      t.type === "income"
                        ? "text-sm font-semibold text-emerald-700 shrink-0"
                        : "text-sm font-semibold text-rose-700 shrink-0"
                    }
                  >
                    {t.type === "income" ? "+" : "−"} {formatBRL(Number(t.amount))}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
