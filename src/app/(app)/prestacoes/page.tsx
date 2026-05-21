import Link from "next/link";
import { FileText, Plus, ArrowRight } from "lucide-react";
import {
  listarPrestacoes,
  STATUS_PRESTACAO_LABEL,
  STATUS_PRESTACAO_CORES,
  TIPO_PRESTACAO_LABEL,
} from "@/lib/prestacoes";
import { formatBRL, formatDate, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PrestacoesPage() {
  const prestacoes = await listarPrestacoes();

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText size={22} className="text-[#1e3a8a]" />
            Prestações de contas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Relatórios mensais (parciais) e final · Modelo SEMAS Nova Iguaçu / Lei 13.019/2014, art. 63
          </p>
        </div>
        <Link
          href="/prestacoes/nova"
          className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 shrink-0"
        >
          <Plus size={14} /> Nova prestação
        </Link>
      </div>

      {prestacoes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <FileText size={32} className="mx-auto text-slate-400 mb-3" />
          <p className="text-slate-600 font-medium">Nenhuma prestação cadastrada</p>
          <p className="text-sm text-slate-500 mt-1">
            Clique em &ldquo;Nova prestação&rdquo; pra gerar o relatório consolidado de um período.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Convênio</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Período</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Protocolo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Glosa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {prestacoes.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/prestacoes/${p.id}`} className="font-mono text-sm font-semibold text-[#1e3a8a] hover:underline">
                      {p.convenio_numero}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {TIPO_PRESTACAO_LABEL[p.tipo]}
                    {p.numero_parcela && <span className="text-slate-500 ml-1">· {p.numero_parcela}ª parcela</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                    {formatDate(p.periodo_inicio)} – {formatDate(p.periodo_fim)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                    {p.protocolo ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-sm whitespace-nowrap">
                    {p.glosa_total > 0 ? (
                      <span className="text-red-600 font-medium">{formatBRL(p.glosa_total)}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border",
                      STATUS_PRESTACAO_CORES[p.status]
                    )}>
                      {STATUS_PRESTACAO_LABEL[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/prestacoes/${p.id}`}
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
