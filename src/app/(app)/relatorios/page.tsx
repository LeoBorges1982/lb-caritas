import Link from "next/link";
import { BarChart3, FileText, Calendar, AlertCircle, Wallet, ListChecks, ArrowRight } from "lucide-react";
import { listarConvenios } from "@/lib/convenios";
import { formatBRL, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  const convenios = await listarConvenios();

  // KPIs gerais
  const totalConvenios = convenios.length;
  const vigentes = convenios.filter((c) => c.status === "vigente").length;
  const valorTotalContratado = convenios.reduce((s, c) => s + c.valor_total, 0);
  const totalSaidas = convenios.reduce((s, c) => s + (c.total_saidas ?? 0), 0);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 size={22} className="text-[#1e3a8a]" /> Relatórios
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Visão consolidada dos convênios, prestações de contas e movimentações financeiras.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Total convênios" valor={String(totalConvenios)} cor="text-slate-900" />
        <KPI label="Vigentes" valor={String(vigentes)} cor="text-emerald-700" />
        <KPI label="Valor contratado" valor={formatBRL(valorTotalContratado)} cor="text-[#1e3a8a]" />
        <KPI label="Total executado" valor={formatBRL(totalSaidas)} cor="text-slate-900"
          sub={`${valorTotalContratado > 0 ? ((totalSaidas / valorTotalContratado) * 100).toFixed(1) : 0}%`} />
      </div>

      {/* Cards de relatórios disponíveis */}
      <div>
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">Relatórios disponíveis</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <CardRelatorio
            href="/prestacoes"
            icone={<FileText size={20} />}
            titulo="Prestações de Contas"
            descricao="Visualizar, gerar e imprimir prestações no modelo SEMAS"
          />
          <CardRelatorio
            href="/balancetes"
            icone={<Calendar size={20} />}
            titulo="Balancetes Mensais"
            descricao="Consolidado mensal por convênio"
          />
          <CardRelatorio
            href="/lancamentos"
            icone={<ListChecks size={20} />}
            titulo="Lançamentos Detalhados"
            descricao="Filtre por convênio, período, rubrica e status"
          />
          <CardRelatorio
            href="/reembolsos"
            icone={<Wallet size={20} />}
            titulo="Reembolsos"
            descricao="Solicitações de reembolso da OSC à conta do convênio"
          />
          <CardRelatorio
            href="/alertas"
            icone={<AlertCircle size={20} />}
            titulo="Alertas e Notificações"
            descricao="Vencimentos, saldo crítico, glosas pendentes"
          />
          <CardRelatorio
            href="/convenios"
            icone={<BarChart3 size={20} />}
            titulo="Convênios"
            descricao="Lista completa com saldo, execução e vigência"
          />
        </div>
      </div>

      {/* Lista de convênios pra acesso rápido */}
      {convenios.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">Convênios — acesso rápido</h2>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-xs text-slate-600 uppercase">
                  <th className="px-4 py-3 font-semibold">Convênio</th>
                  <th className="px-4 py-3 font-semibold">OSC</th>
                  <th className="px-4 py-3 font-semibold text-right">Valor total</th>
                  <th className="px-4 py-3 font-semibold text-right">Executado</th>
                  <th className="px-4 py-3 font-semibold">Vigência</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {convenios.map((c) => {
                  const exec = c.valor_total > 0 ? ((c.total_saidas / c.valor_total) * 100) : 0;
                  return (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/convenios/${c.id}`} className="font-mono text-xs text-[#1e3a8a] hover:underline">{c.numero}</Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-[280px] truncate">{c.osc_nome}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800 tabular-nums">{formatBRL(c.valor_total)}</td>
                      <td className="px-4 py-3 text-right text-xs text-slate-600">{exec.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {formatDate(c.vigencia_inicio)} – {formatDate(c.vigencia_fim)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/convenios/${c.id}`} className="text-slate-400 hover:text-[#1e3a8a]">
                          <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ label, valor, cor, sub }: { label: string; valor: string; cor: string; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${cor}`}>{valor}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function CardRelatorio({ href, icone, titulo, descricao }: { href: string; icone: React.ReactNode; titulo: string; descricao: string }) {
  return (
    <Link href={href} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-[#1e3a8a]/40 hover:shadow-md transition flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-[#1e3a8a]/10 text-[#1e3a8a] flex items-center justify-center shrink-0">{icone}</div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-900 text-sm">{titulo}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{descricao}</p>
      </div>
      <ArrowRight size={14} className="text-slate-400 shrink-0 mt-2" />
    </Link>
  );
}
