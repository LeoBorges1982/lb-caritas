import Link from "next/link";
import { ArrowRight, FileSignature } from "lucide-react";
import { getSessao } from "@/lib/sessao";
import { listarConvenios } from "@/lib/convenios";
import { formatBRL, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sessao = await getSessao();
  const nome = sessao?.nome || sessao?.email?.split("@")[0] || "usuário";

  const convenios = await listarConvenios();
  const totalCarteira = convenios.reduce((acc, c) => acc + c.valor_total, 0);
  const totalSaldo = convenios.reduce((acc, c) => acc + (c.saldo_atual ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Olá, {nome}</h1>
        <p className="text-sm text-slate-500 mt-1">
          Visão geral da carteira de convênios públicos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Convênios na carteira</div>
          <div className="text-3xl font-bold text-slate-900">{convenios.length}</div>
          <div className="text-xs text-slate-500 mt-1">
            {convenios.filter((c) => c.status === "vigente").length} vigentes
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Valor total contratado</div>
          <div className="text-3xl font-bold text-slate-900">{formatBRL(totalCarteira)}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Saldo atual consolidado</div>
          <div className="text-3xl font-bold text-[#1e3a8a]">{formatBRL(totalSaldo)}</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <FileSignature size={16} className="text-[#1e3a8a]" />
            Convênios
          </h2>
          <Link href="/convenios" className="text-xs text-[#1e3a8a] hover:underline inline-flex items-center gap-1">
            Ver todos <ArrowRight size={12} />
          </Link>
        </div>

        {convenios.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-sm text-slate-500">Nenhum convênio cadastrado ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {convenios.slice(0, 5).map((c) => (
              <Link
                key={c.id}
                href={`/convenios/${c.id}`}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-[#1e3a8a]/40 hover:shadow-md transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-[#1e3a8a]">{c.numero}</span>
                    <span className="text-xs text-slate-500">· {c.orgao_sigla}</span>
                  </div>
                  <div className="text-sm text-slate-700 mt-0.5 line-clamp-1">{c.objeto}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Vigência {formatDate(c.vigencia_inicio)} → {formatDate(c.vigencia_fim)}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-sm font-semibold text-slate-800">{formatBRL(c.valor_total)}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Saldo {formatBRL(c.saldo_atual ?? 0)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
