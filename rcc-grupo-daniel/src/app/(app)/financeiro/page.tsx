import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, canManageFinance } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import { getFinanceSummary } from "@/lib/queries";
import {
  formatBRL,
  formatDate,
  CATEGORIAS_RECEITA,
  CATEGORIAS_DESPESA,
  FORMAS_PAGAMENTO,
} from "@/lib/utils";
import { PageHeader, Card, StatCard, Badge, EmptyState } from "@/components/ui";
import { Plus, Truck } from "lucide-react";
import { updateTransactionStatus } from "./actions";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; status?: string; mes?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !canManageFinance(user)) redirect("/dashboard");

  const { tipo, status, mes } = await searchParams;
  const db = adminClient();
  const summary = await getFinanceSummary();

  let query = db
    .from("rcc_financial_transactions")
    .select("*, rcc_members(full_name), rcc_suppliers(name)")
    .order("date", { ascending: false })
    .limit(100);
  if (tipo) query = query.eq("type", tipo);
  if (status) query = query.eq("status", status);
  if (mes) {
    query = query.gte("date", `${mes}-01`).lte("date", `${mes}-31`);
  }
  const { data: txs } = await query;

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle="Receitas, despesas e saldo em caixa"
        action={
          <div className="flex gap-2">
            <Link
              href="/financeiro/fornecedores"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Truck className="h-4 w-4" /> Fornecedores
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-4">
        <StatCard label="Saldo em caixa" value={formatBRL(summary.saldo)} tone={summary.saldo >= 0 ? "green" : "red"} />
        <StatCard label="Receitas do mês" value={formatBRL(summary.receitasMes)} tone="green" />
        <StatCard label="Despesas do mês" value={formatBRL(summary.despesasMes)} tone="red" />
        <StatCard label="Doações PIX no mês" value={formatBRL(summary.doacoesPixMes)} tone="gold" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Link
          href="/financeiro/nova-receita"
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" /> Nova receita
        </Link>
        <Link
          href="/financeiro/nova-despesa"
          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
        >
          <Plus className="h-4 w-4" /> Nova despesa
        </Link>
      </div>

      {/* Filtros */}
      <form className="mb-4 grid grid-cols-3 gap-2 sm:max-w-lg">
        <select name="tipo" defaultValue={tipo ?? ""} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white">
          <option value="">Tudo</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </select>
        <select name="status" defaultValue={status ?? ""} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white">
          <option value="">Todos status</option>
          <option value="confirmado">Confirmado</option>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <div className="flex gap-2">
          <input type="month" name="mes" defaultValue={mes} className="flex-1 rounded-xl border border-slate-300 px-2 py-2.5 text-sm bg-white" />
          <button className="rounded-xl bg-blue-700 px-3 text-sm font-semibold text-white">OK</button>
        </div>
      </form>

      {!txs || txs.length === 0 ? (
        <EmptyState emoji="💰" text="Nenhum lançamento encontrado." />
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {txs.map((t) => {
              const isIncome = t.type === "income";
              const catLabel = isIncome
                ? CATEGORIAS_RECEITA[t.category] ?? t.category
                : CATEGORIAS_DESPESA[t.category] ?? t.category;
              const who =
                (t.rcc_members as { full_name?: string } | null)?.full_name ??
                (t.rcc_suppliers as { name?: string } | null)?.name;
              const nextStatus = t.status === "pendente" ? (isIncome ? "confirmado" : "pago") : null;
              return (
                <li key={t.id} className="p-3.5 flex items-center gap-3">
                  <div
                    className={
                      "h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-bold " +
                      (isIncome ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")
                    }
                  >
                    {isIncome ? "+" : "−"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {catLabel}
                      {who ? ` · ${who}` : ""}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {formatDate(t.date)}
                      {t.payment_method ? ` · ${FORMAS_PAGAMENTO[t.payment_method]}` : ""}
                      {t.description ? ` · ${t.description}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <p className={"text-sm font-bold " + (isIncome ? "text-emerald-700" : "text-rose-700")}>
                      {formatBRL(Number(t.amount))}
                    </p>
                    <div className="flex items-center gap-1.5 justify-end">
                      <Badge value={t.status} />
                      {nextStatus && (
                        <form action={updateTransactionStatus.bind(null, t.id, nextStatus)}>
                          <button className="text-xs font-semibold text-blue-700 hover:underline">
                            Dar baixa
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
