import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listarOpcoesFormulario } from "@/lib/lancamentos";
import LancamentoForm from "@/components/LancamentoForm";
import { criarLancamento } from "../actions";

export const dynamic = "force-dynamic";

export default async function NovoLancamentoPage() {
  const opcoes = await listarOpcoesFormulario();

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link href="/lancamentos" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a] transition">
          <ArrowLeft size={14} /> Voltar para Lançamentos
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Novo lançamento</h1>
        <p className="text-sm text-slate-500 mt-1">
          Cadastre uma movimentação do convênio. Vincule à meta e rubrica do plano de trabalho.
        </p>
      </div>

      <LancamentoForm modo="criar" opcoes={opcoes} action={criarLancamento} />
    </div>
  );
}
