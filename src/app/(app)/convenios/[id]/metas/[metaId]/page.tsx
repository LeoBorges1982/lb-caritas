import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Target, Calendar } from "lucide-react";
import { buscarConvenio } from "@/lib/convenios";
import { listarPlanoComMetas } from "@/lib/metas";
import { listarAnexos } from "@/lib/anexos";
import { formatBRL, formatDate } from "@/lib/utils";
import AnexosBloco from "@/components/AnexosBloco";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string; metaId: string }>;
}

export default async function MetaDetalhePage({ params }: PageProps) {
  const { id, metaId } = await params;
  const [convenio, planoComMetas, anexos] = await Promise.all([
    buscarConvenio(id),
    listarPlanoComMetas(id),
    listarAnexos("meta", metaId),
  ]);
  if (!convenio) notFound();

  const meta = planoComMetas.objetivos
    .flatMap((o) => o.metas)
    .find((m) => m.id === metaId);
  if (!meta) notFound();

  const tituloCurto = meta.titulo.replace(/^OBJETIVO\s+\d+\s*[·\-]\s*/i, "");

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href={`/convenios/${id}/metas`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a]">
        <ArrowLeft size={14} /> Voltar ao Plano de Trabalho
      </Link>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="bg-[#1e3a8a]/10 text-[#1e3a8a] font-mono font-bold px-3 py-1.5 rounded text-sm shrink-0">
            {meta.codigo}
          </div>
          <div className="flex-1">
            {meta.objetivo && (
              <div className="text-xs font-semibold text-[#1e3a8a] uppercase tracking-wide mb-1">{meta.objetivo}</div>
            )}
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Target size={20} className="text-[#1e3a8a]" />
              {tituloCurto}
            </h1>
            {meta.descricao && (
              <p className="text-sm text-slate-700 mt-2">{meta.descricao}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {meta.indicador && (
          <InfoBox titulo="Indicador">
            <span className="text-sm text-slate-800">{meta.indicador}</span>
          </InfoBox>
        )}
        {meta.meio_verificacao && (
          <InfoBox titulo="Meio de verificação">
            <span className="text-sm text-slate-800">{meta.meio_verificacao}</span>
          </InfoBox>
        )}
        {meta.quantidade_prevista !== null && meta.unidade_medida && (
          <InfoBox titulo="Meta física prevista">
            <span className="text-sm font-semibold text-slate-900">
              {meta.quantidade_prevista.toLocaleString("pt-BR")} {meta.unidade_medida}
            </span>
          </InfoBox>
        )}
        {(meta.data_inicio || meta.data_fim) && (
          <InfoBox titulo="Vigência da meta">
            <span className="text-sm text-slate-700 flex items-center gap-1.5">
              <Calendar size={12} />
              {formatDate(meta.data_inicio)} – {formatDate(meta.data_fim)}
            </span>
          </InfoBox>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <InfoBox titulo="Lançamentos vinculados">
          <span className="text-2xl font-bold text-slate-900">{meta.qtd_lancamentos}</span>
          {meta.valor_realizado > 0 && (
            <div className="text-xs text-slate-500 mt-1">Total: {formatBRL(meta.valor_realizado)}</div>
          )}
        </InfoBox>
        <InfoBox titulo="Convênio">
          <Link href={`/convenios/${id}`} className="text-sm font-mono text-[#1e3a8a] hover:underline">
            {convenio.numero}
          </Link>
          <div className="text-xs text-slate-500 mt-1">{convenio.objeto.slice(0, 80)}…</div>
        </InfoBox>
      </div>

      <AnexosBloco
        convenioId={id}
        entidade="meta"
        entidadeId={metaId}
        anexos={anexos}
        revalidatePath={`/convenios/${id}/metas/${metaId}`}
        titulo="Relatórios e evidências da meta (listas de presença, fotos, atas)"
      />
    </div>
  );
}

function InfoBox({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{titulo}</div>
      <div>{children}</div>
    </div>
  );
}
