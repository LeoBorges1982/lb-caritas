import Link from "next/link";
import { BookOpenCheck, ArrowRight } from "lucide-react";
import { listarConveniosParaBalancete, listarMesesComMovimento } from "@/lib/balancetes";
import { formatBRL, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ convenio_id?: string }>;
}

const MESES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function labelMes(mes: string) {
  const [ano, m] = mes.split("-").map(Number);
  return `${MESES_PT[m - 1]}/${ano}`;
}

export default async function BalancetesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const convenios = await listarConveniosParaBalancete();
  const convenioId = sp.convenio_id ?? convenios[0]?.id;

  if (!convenioId) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
        <BookOpenCheck size={32} className="mx-auto text-slate-400 mb-3" />
        <p className="text-slate-600">Nenhum convênio cadastrado.</p>
      </div>
    );
  }

  const meses = await listarMesesComMovimento(convenioId);

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpenCheck size={22} className="text-[#1e3a8a]" />
          Balancetes mensais
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Consolidado de movimentação por mês · pronto pra protocolar na SEMAS
        </p>
      </div>

      {convenios.length > 1 && (
        <form>
          <label className="text-xs font-medium text-slate-700 block mb-1">Convênio</label>
          <select
            name="convenio_id"
            defaultValue={convenioId}
            className="w-full md:w-auto bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
            onChange={(e) => { e.currentTarget.form?.requestSubmit(); }}
          >
            {convenios.map((c) => (
              <option key={c.id} value={c.id}>{c.numero}</option>
            ))}
          </select>
        </form>
      )}

      {meses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <BookOpenCheck size={32} className="mx-auto text-slate-400 mb-3" />
          <p className="text-slate-600">Nenhum mês com movimentação ainda.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Mês</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Entradas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Saídas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Saldo do mês</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Lançamentos</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {meses.map((m) => (
                <tr key={m.mes} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/balancetes/${convenioId}/${m.mes}`}
                      className="text-sm font-semibold text-[#1e3a8a] hover:underline"
                    >
                      {labelMes(m.mes)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-emerald-700 font-medium">
                    {formatBRL(m.total_entradas)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-red-600 font-medium">
                    {formatBRL(m.total_saidas)}
                  </td>
                  <td className={cn(
                    "px-4 py-3 text-right text-sm font-bold",
                    m.saldo_movimento >= 0 ? "text-slate-900" : "text-red-700"
                  )}>
                    {formatBRL(m.saldo_movimento)}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-slate-600">{m.qtd_lancamentos}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/balancetes/${convenioId}/${m.mes}`}
                      className="inline-flex p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#1e3a8a]"
                    >
                      <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
