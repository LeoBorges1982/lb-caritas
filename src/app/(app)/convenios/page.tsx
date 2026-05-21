import Link from "next/link";
import { ArrowRight, FileSignature, AlertTriangle } from "lucide-react";
import { listarConvenios, STATUS_LABEL, STATUS_CORES, TIPO_LABEL } from "@/lib/convenios";
import { formatBRL, formatDate, diasAteVigencia, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ConveniosPage() {
  const convenios = await listarConvenios();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Convênios</h1>
          <p className="text-sm text-slate-500 mt-1">
            Parcerias da Lei 13.019/2014 · {convenios.length} {convenios.length === 1 ? "registro" : "registros"}
          </p>
        </div>
      </div>

      {convenios.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <FileSignature size={32} className="mx-auto text-slate-400 mb-3" />
          <p className="text-slate-600 font-medium">Nenhum convênio cadastrado</p>
          <p className="text-sm text-slate-500 mt-1">
            O seed do convênio 001/FMAS/2025 não rodou neste ambiente.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Número</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">OSC</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Órgão</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Valor total</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Saldo</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Vigência</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {convenios.map((c) => {
                const diasRestantes = diasAteVigencia(c.vigencia_fim);
                const proximoVencimento = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 90;
                const venceu = diasRestantes !== null && diasRestantes < 0;
                const executado = c.valor_total > 0 ? (c.total_saidas / c.valor_total) * 100 : 0;

                return (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition"
                  >
                    <td className="px-5 py-4">
                      <Link href={`/convenios/${c.id}`} className="font-mono text-sm font-semibold text-[#1e3a8a] hover:underline">
                        {c.numero}
                      </Link>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {TIPO_LABEL[c.tipo] ?? c.tipo}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-slate-800 line-clamp-2 max-w-[280px]">{c.osc_nome}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-slate-700">{c.orgao_sigla ?? "—"}</div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="text-sm font-semibold text-slate-800">{formatBRL(c.valor_total)}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{executado.toFixed(1)}% executado</div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="text-sm text-slate-800">
                        {c.saldo_atual !== null ? formatBRL(c.saldo_atual) : "—"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-slate-700">
                        {formatDate(c.vigencia_inicio)} – {formatDate(c.vigencia_fim)}
                      </div>
                      {venceu && (
                        <div className="flex items-center gap-1 text-[11px] text-red-600 mt-0.5 font-medium">
                          <AlertTriangle size={11} /> vencido há {Math.abs(diasRestantes!)} dias
                        </div>
                      )}
                      {proximoVencimento && (
                        <div className="flex items-center gap-1 text-[11px] text-amber-600 mt-0.5 font-medium">
                          <AlertTriangle size={11} /> vence em {diasRestantes} dias
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
                        STATUS_CORES[c.status]
                      )}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/convenios/${c.id}`}
                        className="inline-flex p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#1e3a8a] transition"
                        title="Ver detalhes"
                      >
                        <ArrowRight size={16} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
