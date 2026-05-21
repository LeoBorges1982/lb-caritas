import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listarConveniosParaBalancete } from "@/lib/balancetes";
import { criarPrestacao } from "../actions";

export const dynamic = "force-dynamic";

export default async function NovaPrestacaoPage() {
  const convenios = await listarConveniosParaBalancete();

  // Sugere período: trimestre atual
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const trimMes = Math.floor(mes / 3) * 3;
  const inicio = new Date(ano, trimMes, 1).toISOString().slice(0, 10);
  const fimDate = new Date(ano, trimMes + 3, 0);
  const fim = fimDate.toISOString().slice(0, 10);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/prestacoes" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a]">
          <ArrowLeft size={14} /> Voltar
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Nova prestação de contas</h1>
        <p className="text-sm text-slate-500 mt-1">
          Define o convênio, o tipo e o período. O sistema vai gerar o relatório consolidado automaticamente.
        </p>
      </div>

      <form action={criarPrestacao} className="space-y-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-700 block mb-1">
                Convênio <span className="text-red-500">*</span>
              </span>
              <select name="convenio_id" required className={inputCn} defaultValue={convenios[0]?.id ?? ""}>
                {convenios.map((c) => (
                  <option key={c.id} value={c.id}>{c.numero}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700 block mb-1">
                Tipo <span className="text-red-500">*</span>
              </span>
              <select name="tipo" required className={inputCn} defaultValue="parcial">
                <option value="parcial">Parcial (trimestral)</option>
                <option value="final">Final</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-700 block mb-1">
                Início do período <span className="text-red-500">*</span>
              </span>
              <input name="periodo_inicio" type="date" required defaultValue={inicio} className={inputCn} />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700 block mb-1">
                Fim do período <span className="text-red-500">*</span>
              </span>
              <input name="periodo_fim" type="date" required defaultValue={fim} className={inputCn} />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-slate-700 block mb-1">Observações</span>
            <textarea
              name="observacoes"
              rows={3}
              placeholder="Notas sobre a prestação, contexto, mudanças no período…"
              className={inputCn}
            />
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <Link href="/prestacoes" className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
            Cancelar
          </Link>
          <button
            type="submit"
            className="px-5 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-medium rounded-lg"
          >
            Criar prestação
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCn =
  "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]/60";
