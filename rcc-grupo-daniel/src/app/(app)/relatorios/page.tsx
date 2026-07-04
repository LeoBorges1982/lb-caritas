import { redirect } from "next/navigation";
import { getSessionUser, canManageFinance } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import {
  formatBRL,
  formatDate,
  CATEGORIAS_RECEITA,
  CATEGORIAS_DESPESA,
} from "@/lib/utils";
import { PageHeader, Card, StatCard } from "@/components/ui";
import { Download, Printer } from "lucide-react";

export const dynamic = "force-dynamic";

function monthKey(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  return d.toISOString().slice(0, 7);
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 2;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 text-slate-500 truncate">{label}</span>
      <div className="flex-1 h-4 rounded bg-slate-100 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-24 shrink-0 text-right font-medium text-slate-700">{formatBRL(value)}</span>
    </div>
  );
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !canManageFinance(user)) redirect("/dashboard");

  const sp = await searchParams;
  const de = sp.de || monthKey(2) + "-01";
  const ate = sp.ate || new Date().toISOString().slice(0, 10);

  const db = adminClient();
  const { data } = await db
    .from("rcc_financial_transactions")
    .select("*, rcc_members(full_name), rcc_suppliers(name)")
    .gte("date", de)
    .lte("date", ate)
    .order("date");
  const rows = data ?? [];

  const receitas = rows.filter((r) => r.type === "income" && r.status === "confirmado");
  const despesas = rows.filter((r) => r.type === "expense" && r.status === "pago");
  const totalReceitas = receitas.reduce((s, r) => s + Number(r.amount), 0);
  const totalDespesas = despesas.reduce((s, r) => s + Number(r.amount), 0);
  const totalPix = receitas
    .filter((r) => r.payment_method === "pix")
    .reduce((s, r) => s + Number(r.amount), 0);

  const byCat = (list: typeof rows, labels: Record<string, string>) => {
    const map = new Map<string, number>();
    for (const r of list) {
      const label = labels[r.category] ?? r.category;
      map.set(label, (map.get(label) ?? 0) + Number(r.amount));
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  };
  const receitasPorCat = byCat(receitas, CATEGORIAS_RECEITA);
  const despesasPorCat = byCat(despesas, CATEGORIAS_DESPESA);

  // Evolução mensal do saldo (últimos 6 meses, sobre todos os dados)
  const { data: allTx } = await db
    .from("rcc_financial_transactions")
    .select("type, amount, date, status");
  const months = Array.from({ length: 6 }, (_, i) => monthKey(5 - i));
  const evolucao = months.map((m) => {
    let inc = 0,
      exp = 0;
    for (const r of allTx ?? []) {
      if (String(r.date).slice(0, 7) !== m) continue;
      if (r.type === "income" && r.status === "confirmado") inc += Number(r.amount);
      if (r.type === "expense" && r.status === "pago") exp += Number(r.amount);
    }
    return { mes: m, inc, exp };
  });
  const maxEvol = Math.max(...evolucao.flatMap((e) => [e.inc, e.exp]), 1);
  const maxCat = Math.max(...receitasPorCat.map(([, v]) => v), ...despesasPorCat.map(([, v]) => v), 1);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Prestação de contas"
        subtitle={`Período: ${formatDate(de)} a ${formatDate(ate)}`}
        action={
          <div className="flex gap-2 print:hidden">
            <a
              href={`/api/relatorios/csv?de=${de}&ate=${ate}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" /> CSV
            </a>
          </div>
        }
      />

      <form className="flex flex-wrap gap-2 print:hidden">
        <input type="date" name="de" defaultValue={de} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white" />
        <input type="date" name="ate" defaultValue={ate} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white" />
        <button className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">
          Aplicar período
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Entradas no período" value={formatBRL(totalReceitas)} tone="green" />
        <StatCard label="Saídas no período" value={formatBRL(totalDespesas)} tone="red" />
        <StatCard label="Resultado" value={formatBRL(totalReceitas - totalDespesas)} tone={totalReceitas - totalDespesas >= 0 ? "green" : "red"} />
        <StatCard
          label="Doações via PIX"
          value={formatBRL(totalPix)}
          tone="gold"
          hint={totalReceitas > 0 ? `${Math.round((totalPix / totalReceitas) * 100)}% das entradas` : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-slate-800 mb-3">Receitas por categoria</h2>
          <div className="space-y-2">
            {receitasPorCat.length === 0 && <p className="text-sm text-slate-500">Sem receitas no período.</p>}
            {receitasPorCat.map(([label, value]) => (
              <Bar key={label} label={label} value={value} max={maxCat} color="bg-emerald-500" />
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-800 mb-3">Despesas por categoria</h2>
          <div className="space-y-2">
            {despesasPorCat.length === 0 && <p className="text-sm text-slate-500">Sem despesas no período.</p>}
            {despesasPorCat.map(([label, value]) => (
              <Bar key={label} label={label} value={value} max={maxCat} color="bg-rose-500" />
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold text-slate-800 mb-3">Entradas × saídas — últimos 6 meses</h2>
        <div className="space-y-3">
          {evolucao.map((e) => (
            <div key={e.mes} className="space-y-1">
              <p className="text-xs font-medium text-slate-500">{formatDate(e.mes + "-01", "MMM/yyyy")}</p>
              <Bar label="Entradas" value={e.inc} max={maxEvol} color="bg-emerald-500" />
              <Bar label="Saídas" value={e.exp} max={maxEvol} color="bg-rose-500" />
            </div>
          ))}
        </div>
      </Card>

      <Card className="print:shadow-none">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800">Movimentações do período</h2>
          <span className="text-xs text-slate-400 print:hidden inline-flex items-center gap-1">
            <Printer className="h-3.5 w-3.5" /> Use imprimir do navegador para PDF
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3">Data</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Categoria</th>
                <th className="py-2 pr-3">Membro/Fornecedor</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50">
                  <td className="py-2 pr-3 whitespace-nowrap">{formatDate(r.date)}</td>
                  <td className="py-2 pr-3">{r.type === "income" ? "Receita" : "Despesa"}</td>
                  <td className="py-2 pr-3">
                    {(r.type === "income" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA)[r.category] ?? r.category}
                  </td>
                  <td className="py-2 pr-3">
                    {(r.rcc_members as { full_name?: string } | null)?.full_name ??
                      (r.rcc_suppliers as { name?: string } | null)?.name ??
                      "—"}
                  </td>
                  <td className="py-2 pr-3 capitalize">{r.status}</td>
                  <td className={"py-2 text-right font-medium " + (r.type === "income" ? "text-emerald-700" : "text-rose-700")}>
                    {r.type === "income" ? "+" : "−"} {formatBRL(Number(r.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
