import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Wallet, AlertTriangle, ExternalLink } from "lucide-react";
import { buscarReembolso, STATUS_REEMB_LABEL, STATUS_REEMB_CORES } from "@/lib/reembolsos";
import { listarAnexos } from "@/lib/anexos";
import { formatBRL, formatDate, formatCPF, cn } from "@/lib/utils";
import AcoesReembolso from "@/components/AcoesReembolso";
import AnexosBloco from "@/components/AnexosBloco";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReembolsoDetalhePage({ params }: PageProps) {
  const { id } = await params;
  const r = await buscarReembolso(id);
  if (!r) notFound();

  // Reembolso usa entidade "lancamento" no anexos pra reaproveitar (ou criar tipo novo)
  // Por simplicidade vou criar uma entidade lógica via tipo customizado
  const anexos = await listarAnexos("lancamento", id);

  return (
    <div className="space-y-5 max-w-4xl">
      <Link href="/reembolsos" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a]">
        <ArrowLeft size={14} /> Voltar
      </Link>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium border", STATUS_REEMB_CORES[r.status])}>
                {STATUS_REEMB_LABEL[r.status]}
              </span>
              <Link href={`/convenios/${r.convenio_id}`} className="text-xs font-mono text-[#1e3a8a] hover:underline">
                {r.convenio_numero}
              </Link>
            </div>
            <h1 className="text-lg font-semibold text-slate-900">{r.solicitante_nome}</h1>
            {r.solicitante_cpf && <div className="text-sm text-slate-600">{formatCPF(r.solicitante_cpf)}</div>}
            <p className="text-sm text-slate-700 mt-2 max-w-2xl">{r.descricao}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-slate-900">{formatBRL(r.valor)}</div>
            <div className="text-xs text-slate-500 mt-1">Despesa em {formatDate(r.data_despesa)}</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Workflow</div>
        <AcoesReembolso id={r.id} status={r.status} valor={r.valor} />
      </div>

      <div className="grid gap-3 md:grid-cols-3 text-sm">
        <InfoBox titulo="Categoria">
          {r.categoria_codigo ? (
            <>
              <div className="font-medium text-slate-800">{r.categoria_codigo}</div>
              <div className="text-slate-600 text-xs">{r.categoria_nome}</div>
            </>
          ) : <span className="text-slate-400">—</span>}
        </InfoBox>
        <InfoBox titulo="Meta">
          {r.meta_codigo ?? <span className="text-slate-400">—</span>}
        </InfoBox>
        <InfoBox titulo="Comprovante nº">
          {r.comprovante_numero ?? <span className="text-slate-400">—</span>}
        </InfoBox>
      </div>

      {r.status === "rejeitado" && r.motivo_rejeicao && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-700 mb-2">
            <AlertTriangle size={14} /> Motivo da rejeição
          </div>
          <p className="text-sm text-red-800">{r.motivo_rejeicao}</p>
        </div>
      )}

      {r.status === "pago" && r.lancamento_id && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-sm text-emerald-800">
            <Wallet size={14} />
            Pago em {formatDate(r.pago_em)} ·{" "}
            <Link href={`/lancamentos/${r.lancamento_id}`} className="font-semibold underline flex items-center gap-0.5">
              Ver lançamento gerado <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      )}

      {r.observacoes && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Observações</div>
          <p className="text-sm text-slate-700 whitespace-pre-line">{r.observacoes}</p>
        </div>
      )}

      <AnexosBloco
        convenioId={r.convenio_id}
        entidade="lancamento"
        entidadeId={r.id}
        anexos={anexos}
        revalidatePath={`/reembolsos/${r.id}`}
        titulo="Comprovantes da despesa"
      />

      <div className="text-[11px] text-slate-400 text-right">
        Solicitado em {formatDate(r.criado_em, "dd/MM/yyyy 'às' HH:mm")}
      </div>
    </div>
  );
}

function InfoBox({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{titulo}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
