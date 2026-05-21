import Link from "next/link";
import { Plus, Receipt, ArrowRight } from "lucide-react";
import {
  listarLancamentos,
  listarOpcoesFormulario,
  TIPO_LABEL, TIPO_CORES, TIPO_SINAL,
  STATUS_LABEL, STATUS_CORES,
  type TipoLancamento, type StatusLancamento,
} from "@/lib/lancamentos";
import { formatBRL, formatDate, cn } from "@/lib/utils";
import FiltrosLancamentos from "@/components/FiltrosLancamentos";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    convenio_id?: string;
    tipo?: TipoLancamento;
    status?: StatusLancamento;
    mes?: string;
    busca?: string;
  }>;
}

export default async function LancamentosPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const [lancamentos, opcoes] = await Promise.all([
    listarLancamentos(sp),
    listarOpcoesFormulario(),
  ]);

  // Totais do conjunto filtrado
  const totais = lancamentos.reduce(
    (acc, l) => {
      if (l.status === "cancelado") return acc;
      if (l.tipo === "repasse" || l.tipo === "rendimento") {
        acc.entradas += l.valor;
      } else if (l.tipo === "despesa" && l.status !== "glosado") {
        acc.saidas += l.valor;
      }
      return acc;
    },
    { entradas: 0, saidas: 0 }
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lançamentos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Movimentação financeira do convênio · {lancamentos.length} {lancamentos.length === 1 ? "registro" : "registros"}
          </p>
        </div>
        <Link
          href="/lancamentos/novo"
          className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-1.5 shrink-0"
        >
          <Plus size={14} /> Novo lançamento
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <KPI titulo="Entradas no filtro" valor={formatBRL(totais.entradas)} cor="text-emerald-700" />
        <KPI titulo="Saídas no filtro" valor={formatBRL(totais.saidas)} cor="text-red-600" />
        <KPI titulo="Resultado" valor={formatBRL(totais.entradas - totais.saidas)} cor="text-[#1e3a8a]" />
      </div>

      <FiltrosLancamentos convenios={opcoes.convenios} />

      {lancamentos.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <Receipt size={32} className="mx-auto text-slate-400 mb-3" />
          <p className="text-slate-600 font-medium">Nenhum lançamento encontrado</p>
          <p className="text-sm text-slate-500 mt-1">
            Ajuste os filtros ou crie um novo lançamento.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Data</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Descrição</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition">
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <div className="text-slate-800">{formatDate(l.data_lancamento)}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{l.convenio_numero}</div>
                  </td>
                  <td className="px-4 py-3 max-w-[400px]">
                    <Link href={`/lancamentos/${l.id}`} className="text-sm font-medium text-slate-800 hover:text-[#1e3a8a] line-clamp-1">
                      {l.descricao}
                    </Link>
                    {l.fornecedor_nome && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{l.fornecedor_nome}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {l.categoria_codigo ? (
                      <span title={l.categoria_nome ?? ""}>{l.categoria_codigo}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex px-2 py-0.5 rounded text-[11px] font-medium border", TIPO_CORES[l.tipo])}>
                      {TIPO_LABEL[l.tipo]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className={cn(
                      "text-sm font-semibold",
                      TIPO_SINAL[l.tipo] === "+" && "text-emerald-700",
                      TIPO_SINAL[l.tipo] === "-" && "text-slate-800",
                    )}>
                      {TIPO_SINAL[l.tipo] !== "·" ? TIPO_SINAL[l.tipo] : ""}{formatBRL(l.valor)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex px-2 py-0.5 rounded text-[11px] font-medium border", STATUS_CORES[l.status])}>
                      {STATUS_LABEL[l.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/lancamentos/${l.id}`}
                      className="inline-flex p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#1e3a8a] transition"
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

function KPI({ titulo, valor, cor }: { titulo: string; valor: string; cor: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{titulo}</div>
      <div className={cn("text-xl font-bold mt-1", cor)}>{valor}</div>
    </div>
  );
}
