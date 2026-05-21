import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { listarOpcoesFormulario } from "@/lib/lancamentos";
import ImportadorExtrato from "@/components/ImportadorExtrato";

export const dynamic = "force-dynamic";

export default async function ImportarExtratoPage() {
  const opcoes = await listarOpcoesFormulario();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/lancamentos" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a]">
          <ArrowLeft size={14} /> Voltar para Lançamentos
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Importar extrato bancário</h1>
        <p className="text-sm text-slate-500 mt-1">
          Suba o arquivo OFX ou CSV da conta do convênio. O sistema vai tentar conciliar
          automaticamente com lançamentos previstos.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 max-w-3xl">
        <Info size={16} className="text-blue-700 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900 leading-relaxed">
          <strong className="font-semibold">Auto-conciliação:</strong> transações que casam com lançamentos
          do tipo <em>Previsto</em> (mesmo valor + data dentro de ±3 dias) serão marcadas como{" "}
          <strong>conciliadas</strong>. Transações sem match viram <strong>novos lançamentos</strong>
          {" "}com status <em>Realizado</em>.
        </div>
      </div>

      <ImportadorExtrato convenios={opcoes.convenios} />
    </div>
  );
}
