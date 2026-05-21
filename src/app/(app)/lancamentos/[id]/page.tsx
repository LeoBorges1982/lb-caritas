import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Calendar, Wallet, Building2, Receipt, AlertTriangle } from "lucide-react";
import {
  buscarLancamento,
  TIPO_LABEL, TIPO_CORES, TIPO_SINAL,
  STATUS_LABEL, STATUS_CORES,
  FORMA_PAGAMENTO_LABEL, DOCUMENTO_TIPO_LABEL,
} from "@/lib/lancamentos";
import { formatBRL, formatDate, formatCNPJ, formatCPF, cn } from "@/lib/utils";
import { listarAnexos } from "@/lib/anexos";
import AcoesLancamento from "@/components/AcoesLancamento";
import AnexosLancamento from "@/components/AnexosLancamento";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LancamentoDetalhePage({ params }: PageProps) {
  const { id } = await params;
  const l = await buscarLancamento(id);
  if (!l) notFound();

  const anexos = await listarAnexos("lancamento", id);

  const docFmt = l.fornecedor_documento ? (
    l.fornecedor_documento.replace(/\D/g, "").length === 14
      ? formatCNPJ(l.fornecedor_documento)
      : formatCPF(l.fornecedor_documento)
  ) : null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <Link href="/lancamentos" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a]">
          <ArrowLeft size={14} /> Voltar para Lançamentos
        </Link>
        <Link
          href={`/lancamentos/${id}/editar`}
          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg flex items-center gap-1.5"
        >
          <Pencil size={14} /> Editar
        </Link>
      </div>

      {/* Hero */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex px-2 py-0.5 rounded text-xs font-medium border", TIPO_CORES[l.tipo])}>
                {TIPO_LABEL[l.tipo]}
              </span>
              <span className={cn("inline-flex px-2 py-0.5 rounded text-xs font-medium border", STATUS_CORES[l.status])}>
                {STATUS_LABEL[l.status]}
              </span>
              <Link
                href={`/convenios/${l.convenio_id}`}
                className="text-xs font-mono text-[#1e3a8a] hover:underline"
              >
                {l.convenio_numero}
              </Link>
            </div>
            <h1 className="text-lg font-semibold text-slate-900 mt-2 leading-snug">{l.descricao}</h1>
            <div className="text-xs text-slate-500 mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <span>Lançado em {formatDate(l.data_lancamento)}</span>
              {l.data_pagamento && <span>Pago em {formatDate(l.data_pagamento)}</span>}
              {l.forma_pagamento && <span>{FORMA_PAGAMENTO_LABEL[l.forma_pagamento]}</span>}
              {l.conta_origem && <span>Conta {l.conta_origem}</span>}
            </div>
          </div>
          <div className="text-right">
            <div className={cn(
              "text-3xl font-bold",
              TIPO_SINAL[l.tipo] === "+" ? "text-emerald-700" : "text-slate-900"
            )}>
              {TIPO_SINAL[l.tipo] !== "·" ? TIPO_SINAL[l.tipo] : ""}{formatBRL(l.valor)}
            </div>
            {l.status === "glosado" && l.glosa_valor !== null && (
              <div className="text-xs text-red-600 font-medium mt-1">
                Glosado: {formatBRL(l.glosa_valor)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Ações</div>
        <AcoesLancamento id={l.id} status={l.status} valor={l.valor} />
      </div>

      {/* Cards de info */}
      <div className="grid gap-4 md:grid-cols-2">
        <InfoBox icon={<Wallet size={14} />} titulo="Categoria (rubrica)">
          {l.categoria_codigo ? (
            <>
              <div className="text-sm font-medium text-slate-800">{l.categoria_codigo}</div>
              <div className="text-sm text-slate-600">{l.categoria_nome}</div>
            </>
          ) : (
            <div className="text-sm text-slate-400">Sem categoria vinculada</div>
          )}
        </InfoBox>

        <InfoBox icon={<Calendar size={14} />} titulo="Meta do plano">
          {l.meta_titulo ? (
            <div className="text-sm text-slate-700">{l.meta_titulo}</div>
          ) : (
            <div className="text-sm text-slate-400">Sem meta vinculada</div>
          )}
        </InfoBox>
      </div>

      {/* Fornecedor + documento */}
      {(l.fornecedor_nome || l.documento_tipo) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">
            <Building2 size={14} /> Fornecedor e documento fiscal
          </div>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            {l.fornecedor_nome && (
              <div>
                <div className="text-slate-500 text-xs">Fornecedor</div>
                <div className="text-slate-800 font-medium">{l.fornecedor_nome}</div>
                {docFmt && <div className="text-slate-600 text-xs mt-0.5">{docFmt}</div>}
              </div>
            )}
            {l.documento_tipo && (
              <div>
                <div className="text-slate-500 text-xs">Documento</div>
                <div className="text-slate-800 font-medium">
                  {DOCUMENTO_TIPO_LABEL[l.documento_tipo]}
                  {l.documento_numero && <span className="text-slate-500 font-normal"> · nº {l.documento_numero}</span>}
                </div>
                <div className="text-slate-600 text-xs mt-0.5">
                  {l.documento_data && <span>Data {formatDate(l.documento_data)}</span>}
                  {l.documento_data && l.documento_valor !== null && <span> · </span>}
                  {l.documento_valor !== null && <span>Valor {formatBRL(l.documento_valor)}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Glosa */}
      {l.status === "glosado" && l.glosa_motivo && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-700 mb-2">
            <AlertTriangle size={14} /> Motivo da glosa
          </div>
          <p className="text-sm text-red-800 whitespace-pre-line">{l.glosa_motivo}</p>
        </div>
      )}

      {/* Conciliação */}
      {l.status === "conciliado" && l.conciliado_em && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-800">
          <Receipt size={14} className="inline mr-1.5" />
          Conciliado em {formatDate(l.conciliado_em)} com o extrato bancário.
        </div>
      )}

      {/* Anexos */}
      <AnexosLancamento convenioId={l.convenio_id} lancamentoId={id} anexos={anexos} />

      {/* Observações */}
      {l.observacoes && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Observações</div>
          <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{l.observacoes}</p>
        </div>
      )}

      {/* Metadata */}
      <div className="text-[11px] text-slate-400 text-right">
        Criado em {formatDate(l.criado_em, "dd/MM/yyyy 'às' HH:mm")} · Atualizado em {formatDate(l.atualizado_em, "dd/MM/yyyy 'às' HH:mm")}
      </div>
    </div>
  );
}

function InfoBox({ icon, titulo, children }: { icon: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
        {icon} {titulo}
      </div>
      {children}
    </div>
  );
}
