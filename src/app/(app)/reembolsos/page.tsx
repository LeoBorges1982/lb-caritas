import Link from "next/link";
import { Wallet, Plus, ArrowRight } from "lucide-react";
import { listarReembolsos, STATUS_REEMB_LABEL, STATUS_REEMB_CORES } from "@/lib/reembolsos";
import { formatBRL, formatDate, formatCPF, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReembolsosPage() {
  const reembolsos = await listarReembolsos();

  const totais = reembolsos.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + r.valor;
    acc.qtd[r.status] = (acc.qtd[r.status] ?? 0) + 1;
    return acc;
  }, { solicitado: 0, aprovado: 0, pago: 0, rejeitado: 0, qtd: {} as Record<string, number> });

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet size={22} className="text-[#1e3a8a]" />
            Reembolsos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Solicitações de reembolso a colaboradores que adiantaram despesas do convênio
          </p>
        </div>
        <Link
          href="/reembolsos/novo"
          className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 shrink-0"
        >
          <Plus size={14} /> Nova solicitação
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <KPI titulo="Solicitados" qtd={totais.qtd.solicitado ?? 0} valor={totais.solicitado} cor="text-amber-700" />
        <KPI titulo="Aprovados" qtd={totais.qtd.aprovado ?? 0} valor={totais.aprovado} cor="text-blue-700" />
        <KPI titulo="Pagos" qtd={totais.qtd.pago ?? 0} valor={totais.pago} cor="text-emerald-700" />
        <KPI titulo="Rejeitados" qtd={totais.qtd.rejeitado ?? 0} valor={totais.rejeitado} cor="text-red-600" />
      </div>

      {reembolsos.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <Wallet size={32} className="mx-auto text-slate-400 mb-3" />
          <p className="text-slate-600 font-medium">Nenhum reembolso solicitado</p>
          <p className="text-sm text-slate-500 mt-1">
            Clique em &ldquo;Nova solicitação&rdquo; quando alguém adiantar uma despesa do convênio.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Solicitante</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Despesa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Convênio</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Data</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {reembolsos.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/reembolsos/${r.id}`} className="text-sm font-medium text-slate-800 hover:text-[#1e3a8a]">
                      {r.solicitante_nome}
                    </Link>
                    {r.solicitante_cpf && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{formatCPF(r.solicitante_cpf)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 max-w-[280px]">
                    <div className="line-clamp-1">{r.descricao}</div>
                    {r.categoria_codigo && (
                      <div className="text-[11px] text-slate-500 mt-0.5">Rubrica {r.categoria_codigo}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-700">{r.convenio_numero}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{formatDate(r.data_despesa)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                    {formatBRL(r.valor)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border", STATUS_REEMB_CORES[r.status])}>
                      {STATUS_REEMB_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/reembolsos/${r.id}`} className="inline-flex p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#1e3a8a]">
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

function KPI({ titulo, qtd, valor, cor }: { titulo: string; qtd: number; valor: number; cor: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{titulo}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className={cn("text-xl font-bold", cor)}>{qtd}</span>
        <span className="text-xs text-slate-500">{formatBRL(valor)}</span>
      </div>
    </div>
  );
}
