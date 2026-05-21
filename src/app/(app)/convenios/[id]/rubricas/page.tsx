import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ListChecks, Plus } from "lucide-react";
import { buscarConvenio } from "@/lib/convenios";
import { listarRubricas } from "@/lib/rubricas";
import { formatBRL, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RubricasPage({ params }: PageProps) {
  const { id } = await params;
  const [convenio, resumo] = await Promise.all([
    buscarConvenio(id),
    listarRubricas(id),
  ]);
  if (!convenio) notFound();

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <Link href={`/convenios/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a]">
          <ArrowLeft size={14} /> Voltar ao convênio
        </Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ListChecks size={22} className="text-[#1e3a8a]" />
              Rubricas do convênio
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Plano de custos · {convenio.numero} · execução por categoria
            </p>
          </div>
          <Link
            href={`/lancamentos/novo?convenio_id=${id}`}
            className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0"
          >
            <Plus size={14} /> Novo lançamento
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <KPI titulo="Total previsto" valor={formatBRL(resumo.total_previsto)} />
        <KPI titulo="Realizado" valor={formatBRL(resumo.total_realizado)} sub={`${resumo.percentual_executado.toFixed(1)}% executado`} cor="text-slate-900" />
        <KPI titulo="Saldo a executar" valor={formatBRL(resumo.total_saldo)} cor={resumo.total_saldo < 0 ? "text-red-600" : "text-emerald-700"} />
      </div>

      {resumo.grupos.map((g) => (
        <div key={g.grupo} className="space-y-2">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{g.grupo}</h2>
            <div className="text-xs text-slate-500">
              {formatBRL(g.total_realizado)} <span className="text-slate-400">/ {formatBRL(g.total_previsto)}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase w-20">Código</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase">Rubrica</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase">Previsto</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase">Realizado</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase">Saldo</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase w-48">% executado</th>
                </tr>
              </thead>
              <tbody>
                {g.rubricas.map((r) => {
                  const pctClamp = Math.min(100, Math.max(0, r.percentual_executado));
                  const cor =
                    r.percentual_executado > 100 ? "bg-red-500" :
                    r.percentual_executado > 90 ? "bg-amber-500" :
                    r.percentual_executado > 50 ? "bg-[#1e3a8a]" :
                    "bg-emerald-500";
                  return (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 text-sm font-mono text-slate-700">{r.codigo}</td>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        {r.nome}
                        {r.qtd_lancamentos > 0 && (
                          <span className="text-[11px] text-slate-500 ml-2">· {r.qtd_lancamentos} {r.qtd_lancamentos === 1 ? "lançamento" : "lançamentos"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700 whitespace-nowrap">
                        {formatBRL(r.valor_previsto)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-800 font-medium whitespace-nowrap">
                        {formatBRL(r.valor_realizado)}
                      </td>
                      <td className={cn(
                        "px-4 py-3 text-sm text-right font-medium whitespace-nowrap",
                        r.valor_saldo < 0 ? "text-red-600" : "text-emerald-700"
                      )}>
                        {formatBRL(r.valor_saldo)}
                      </td>
                      <td className="px-4 py-3">
                        {r.valor_previsto > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div className={cn("h-full transition-all", cor)} style={{ width: `${pctClamp}%` }} />
                            </div>
                            <span className={cn(
                              "text-xs font-medium tabular-nums w-12 text-right",
                              r.percentual_executado > 100 ? "text-red-600" :
                              r.percentual_executado > 90 ? "text-amber-700" :
                              "text-slate-600"
                            )}>
                              {r.percentual_executado.toFixed(0)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">sem previsão</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function KPI({ titulo, valor, sub, cor }: { titulo: string; valor: string; sub?: string; cor?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{titulo}</div>
      <div className={cn("text-xl font-bold mt-1", cor ?? "text-slate-900")}>{valor}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
