import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Target, CheckCircle2, FileText } from "lucide-react";
import { buscarConvenio } from "@/lib/convenios";
import { listarPlanoComMetas } from "@/lib/metas";
import { formatBRL, formatDate, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MetasPage({ params }: PageProps) {
  const { id } = await params;
  const [convenio, planoComMetas] = await Promise.all([
    buscarConvenio(id),
    listarPlanoComMetas(id),
  ]);
  if (!convenio) notFound();

  const { plano, objetivos, total_metas } = planoComMetas;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link href={`/convenios/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a]">
          <ArrowLeft size={14} /> Voltar ao convênio
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2 flex items-center gap-2">
          <Target size={22} className="text-[#1e3a8a]" />
          Plano de Trabalho & Metas
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {convenio.numero} · {total_metas} {total_metas === 1 ? "meta" : "metas"} em {objetivos.length} {objetivos.length === 1 ? "objetivo" : "objetivos"}
        </p>
      </div>

      {plano && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <FileText size={14} /> Plano de Trabalho · Versão {plano.versao}
            {plano.aprovado_em && (
              <span className="text-slate-400 normal-case font-normal">· aprovado em {formatDate(plano.aprovado_em)}</span>
            )}
          </div>
          {plano.titulo && (
            <h2 className="text-base font-semibold text-slate-900">{plano.titulo}</h2>
          )}
          {plano.justificativa && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Justificativa</div>
              <p className="text-sm text-slate-700 leading-relaxed">{plano.justificativa}</p>
            </div>
          )}
          {plano.metodologia && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Metodologia</div>
              <p className="text-sm text-slate-700 leading-relaxed">{plano.metodologia}</p>
            </div>
          )}
          {plano.cronograma_resumo && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Cronograma</div>
              <p className="text-sm text-slate-700 leading-relaxed">{plano.cronograma_resumo}</p>
            </div>
          )}
          {plano.observacoes && (
            <div className="text-xs text-slate-500 italic pt-2 border-t border-slate-100">
              {plano.observacoes}
            </div>
          )}
        </div>
      )}

      {objetivos.map((obj) => (
        <div key={obj.objetivo} className="space-y-3">
          <h2 className="text-sm font-bold text-[#1e3a8a] uppercase tracking-wide px-1">{obj.objetivo}</h2>
          <div className="space-y-2">
            {obj.metas.map((m) => {
              const tituloCurto = m.titulo.replace(/^OBJETIVO\s+\d+\s*[·\-]\s*/i, "");
              return (
                <div key={m.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="bg-[#1e3a8a]/10 text-[#1e3a8a] font-mono text-xs font-bold px-2 py-1 rounded shrink-0">
                      {m.codigo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900">{tituloCurto}</h3>
                      {m.descricao && (
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{m.descricao}</p>
                      )}

                      <div className="grid gap-2 md:grid-cols-2 mt-3 text-xs">
                        {m.indicador && (
                          <div>
                            <span className="text-slate-500">Indicador: </span>
                            <span className="text-slate-700">{m.indicador}</span>
                          </div>
                        )}
                        {m.meio_verificacao && (
                          <div>
                            <span className="text-slate-500">Meio de verificação: </span>
                            <span className="text-slate-700">{m.meio_verificacao}</span>
                          </div>
                        )}
                        {m.quantidade_prevista !== null && m.unidade_medida && (
                          <div>
                            <span className="text-slate-500">Meta física: </span>
                            <span className="text-slate-800 font-medium">
                              {m.quantidade_prevista.toLocaleString("pt-BR")} {m.unidade_medida}
                            </span>
                          </div>
                        )}
                        {m.qtd_lancamentos > 0 && (
                          <div>
                            <span className="text-slate-500">Lançamentos vinculados: </span>
                            <span className="text-slate-800 font-medium">{m.qtd_lancamentos}</span>
                            {m.valor_realizado > 0 && (
                              <span className="text-slate-500"> · {formatBRL(m.valor_realizado)}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {(m.data_inicio || m.data_fim) && (
                        <div className="text-[11px] text-slate-500 mt-2">
                          Vigência: {formatDate(m.data_inicio)} – {formatDate(m.data_fim)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {objetivos.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <CheckCircle2 size={32} className="mx-auto text-slate-400 mb-3" />
          <p className="text-slate-600">Nenhuma meta cadastrada para este convênio.</p>
        </div>
      )}
    </div>
  );
}
