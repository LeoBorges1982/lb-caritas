import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldAlert, BookOpen } from "lucide-react";
import { buscarConvenio } from "@/lib/convenios";
import { listarVedacoes } from "@/lib/vedacoes";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VedacoesPage({ params }: PageProps) {
  const { id } = await params;
  const [convenio, vedacoes] = await Promise.all([
    buscarConvenio(id),
    listarVedacoes(id),
  ]);
  if (!convenio) notFound();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href={`/convenios/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a]">
          <ArrowLeft size={14} /> Voltar ao convênio
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2 flex items-center gap-2">
          <ShieldAlert size={22} className="text-red-600" />
          Vedações
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {convenio.numero} · {vedacoes.length} {vedacoes.length === 1 ? "item proibido" : "itens proibidos"} por lei
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900 leading-relaxed">
        <strong className="font-semibold">Atenção:</strong> as vedações abaixo são proibições legais aplicáveis a este
        convênio. Despesas que se enquadrem em qualquer um destes itens podem ser glosadas pelo órgão concedente.
      </div>

      <div className="space-y-2">
        {vedacoes.map((v, i) => (
          <div key={v.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <div className="bg-red-50 text-red-700 font-mono text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0">
              {i + 1}
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-800 font-medium leading-snug">{v.descricao}</p>
              {v.base_legal && (
                <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1.5">
                  <BookOpen size={11} />
                  <span>{v.base_legal}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {vedacoes.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <ShieldAlert size={32} className="mx-auto text-slate-400 mb-3" />
          <p className="text-slate-600">Nenhuma vedação cadastrada para este convênio.</p>
        </div>
      )}
    </div>
  );
}
