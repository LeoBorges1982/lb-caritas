import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buscarLancamento, listarOpcoesFormulario } from "@/lib/lancamentos";
import LancamentoForm from "@/components/LancamentoForm";
import { atualizarLancamento } from "../../actions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarLancamentoPage({ params }: PageProps) {
  const { id } = await params;
  const [lancamento, opcoes] = await Promise.all([
    buscarLancamento(id),
    listarOpcoesFormulario(),
  ]);
  if (!lancamento) notFound();

  const action = atualizarLancamento.bind(null, id);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link href={`/lancamentos/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a]">
          <ArrowLeft size={14} /> Voltar ao lançamento
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Editar lançamento</h1>
        <p className="text-sm text-slate-500 mt-1">Convênio {lancamento.convenio_numero}</p>
      </div>

      <LancamentoForm modo="editar" opcoes={opcoes} inicial={lancamento} action={action} />
    </div>
  );
}
