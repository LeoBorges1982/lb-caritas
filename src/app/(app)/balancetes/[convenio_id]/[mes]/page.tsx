import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenCheck } from "lucide-react";
import { gerarBalanceteMensal, mesLabel } from "@/lib/balancetes";
import { ESCRITORIO } from "@/lib/constants";
import { TIPO_LABEL, TIPO_SINAL } from "@/lib/lancamentos";
import { formatBRL, formatDate, cn } from "@/lib/utils";
import BotaoImprimir from "@/components/BotaoImprimir";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ convenio_id: string; mes: string }>;
}

export default async function BalanceteMensalPage({ params }: PageProps) {
  const { convenio_id, mes } = await params;
  const b = await gerarBalanceteMensal(convenio_id, mes);
  if (!b) notFound();

  return (
    <div className="balancete max-w-5xl mx-auto space-y-5">
      {/* Header (não imprime) */}
      <div className="flex items-center justify-between print:hidden">
        <Link href="/balancetes" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a]">
          <ArrowLeft size={14} /> Voltar aos balancetes
        </Link>
        <BotaoImprimir />
      </div>

      {/* Cabeçalho do balancete (imprime) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm print:border-0 print:shadow-none print:p-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              {ESCRITORIO.nomeFantasia} · {ESCRITORIO.crc}
            </div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpenCheck size={20} className="text-[#1e3a8a] print:hidden" />
              Balancete · {b.mesLabel}
            </h1>
            <div className="text-sm text-slate-700 mt-2">
              Convênio <span className="font-mono font-semibold">{b.convenio.numero}</span>
              {b.convenio.orgao_sigla && <span> · {b.convenio.orgao_sigla}</span>}
            </div>
            <div className="text-sm text-slate-600">{b.convenio.osc_nome}</div>
            <div className="text-xs text-slate-500 mt-1 max-w-2xl">{b.convenio.objeto}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Emitido em</div>
            <div className="text-sm text-slate-800">{formatDate(new Date(), "dd/MM/yyyy")}</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-4 print:grid-cols-4 print:gap-2">
        <Card titulo="Saldo inicial" valor={formatBRL(b.saldo_inicial)} />
        <Card titulo="Entradas no mês" valor={formatBRL(b.total_entradas)} cor="text-emerald-700" sub={b.rendimentos > 0 ? `Rendimentos: ${formatBRL(b.rendimentos)}` : undefined} />
        <Card titulo="Saídas no mês" valor={formatBRL(b.total_saidas)} cor="text-red-600" />
        <Card titulo="Saldo final" valor={formatBRL(b.saldo_final)} cor="text-[#1e3a8a]" destaque />
      </div>

      {/* Por categoria */}
      {b.por_categoria.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm print:border print:rounded print:shadow-none">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 mb-3">
            Despesas por rubrica
          </h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 text-xs font-semibold text-slate-600 uppercase">Código</th>
                <th className="text-left py-2 text-xs font-semibold text-slate-600 uppercase">Rubrica</th>
                <th className="text-center py-2 text-xs font-semibold text-slate-600 uppercase">Qtd</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-600 uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {b.por_categoria.map((c, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 text-sm font-mono text-slate-700">{c.categoria_codigo ?? "—"}</td>
                  <td className="py-2 text-sm text-slate-800">{c.categoria_nome ?? "Sem categoria"}</td>
                  <td className="py-2 text-sm text-center text-slate-600">{c.qtd}</td>
                  <td className="py-2 text-sm text-right font-medium text-slate-800 tabular-nums">{formatBRL(c.total)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-300 font-bold">
                <td colSpan={3} className="py-2 text-sm text-slate-800">Total</td>
                <td className="py-2 text-sm text-right text-slate-900 tabular-nums">{formatBRL(b.total_saidas)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Movimentação detalhada */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm print:border print:rounded print:shadow-none">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 mb-3">
          Movimentação detalhada · {b.qtd_lancamentos} {b.qtd_lancamentos === 1 ? "lançamento" : "lançamentos"}
        </h2>
        {b.lancamentos.length === 0 ? (
          <p className="text-sm text-slate-500">Sem movimentação no mês.</p>
        ) : (
          <table className="w-full text-xs print:text-[10pt]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-1.5 font-semibold text-slate-600 uppercase">Data</th>
                <th className="text-left py-1.5 font-semibold text-slate-600 uppercase">Descrição</th>
                <th className="text-left py-1.5 font-semibold text-slate-600 uppercase">Fornecedor</th>
                <th className="text-left py-1.5 font-semibold text-slate-600 uppercase">Doc.</th>
                <th className="text-left py-1.5 font-semibold text-slate-600 uppercase">Rubrica</th>
                <th className="text-left py-1.5 font-semibold text-slate-600 uppercase">Tipo</th>
                <th className="text-right py-1.5 font-semibold text-slate-600 uppercase">Valor</th>
              </tr>
            </thead>
            <tbody>
              {b.lancamentos.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 whitespace-nowrap text-slate-700">{formatDate(l.data_lancamento)}</td>
                  <td className="py-1.5 text-slate-800 max-w-[280px]">
                    <div className="truncate" title={l.descricao}>{l.descricao}</div>
                  </td>
                  <td className="py-1.5 text-slate-700 max-w-[160px] truncate">{l.fornecedor_nome ?? "—"}</td>
                  <td className="py-1.5 text-slate-700">{l.documento_numero ?? "—"}</td>
                  <td className="py-1.5 text-slate-700">{l.categoria_codigo ?? "—"}</td>
                  <td className="py-1.5 text-slate-700">{TIPO_LABEL[l.tipo]}</td>
                  <td className={cn(
                    "py-1.5 text-right font-semibold tabular-nums whitespace-nowrap",
                    TIPO_SINAL[l.tipo] === "+" ? "text-emerald-700" : "text-slate-800"
                  )}>
                    {TIPO_SINAL[l.tipo] !== "·" ? TIPO_SINAL[l.tipo] : ""}{formatBRL(l.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Rodapé pra impressão */}
      <div className="hidden print:block text-xs text-slate-600 pt-8 border-t border-slate-300">
        <div className="grid grid-cols-2 gap-12 mt-8">
          <div className="text-center">
            <div className="border-t border-slate-800 pt-1 mt-12">
              <strong>{ESCRITORIO.contador}</strong>
              <div>{ESCRITORIO.crc}</div>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-slate-800 pt-1 mt-12">
              <strong>Representante da OSC</strong>
              <div>{b.convenio.osc_nome}</div>
            </div>
          </div>
        </div>
        <div className="text-center mt-8 text-[10pt]">
          {ESCRITORIO.nome} · CNPJ {ESCRITORIO.cnpj} · {ESCRITORIO.endereco}
        </div>
      </div>
    </div>
  );
}

function Card({ titulo, valor, cor, sub, destaque }: {
  titulo: string; valor: string; cor?: string; sub?: string; destaque?: boolean;
}) {
  return (
    <div className={cn(
      "bg-white border border-slate-200 rounded-2xl p-4 shadow-sm print:shadow-none print:rounded print:p-2",
      destaque && "border-[#1e3a8a]/30 ring-1 ring-[#1e3a8a]/20"
    )}>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{titulo}</div>
      <div className={cn("text-lg font-bold mt-1 tabular-nums", cor ?? "text-slate-900")}>{valor}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
