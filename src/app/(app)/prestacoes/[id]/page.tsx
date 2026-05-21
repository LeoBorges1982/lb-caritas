import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Wallet, Target, ListChecks, Receipt, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";
import {
  consolidarPrestacao,
  STATUS_PRESTACAO_LABEL,
  STATUS_PRESTACAO_CORES,
  TIPO_PRESTACAO_LABEL,
} from "@/lib/prestacoes";
import { listarAnexos } from "@/lib/anexos";
import { ESCRITORIO } from "@/lib/constants";
import { TIPO_LABEL, TIPO_SINAL, STATUS_LABEL as STATUS_LANC_LABEL } from "@/lib/lancamentos";
import { formatBRL, formatDate, formatCNPJ, cn } from "@/lib/utils";
import BotaoImprimir from "@/components/BotaoImprimir";
import AcoesPrestacao from "@/components/AcoesPrestacao";
import AnexosBloco from "@/components/AnexosBloco";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PrestacaoDetalhePage({ params }: PageProps) {
  const { id } = await params;
  const c = await consolidarPrestacao(id);
  if (!c) notFound();

  const anexos = await listarAnexos("prestacao", id);

  return (
    <div className="balancete max-w-5xl mx-auto space-y-5">
      {/* Header (não imprime) */}
      <div className="flex items-center justify-between print:hidden">
        <Link href="/prestacoes" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a]">
          <ArrowLeft size={14} /> Voltar
        </Link>
        <BotaoImprimir />
      </div>

      {/* Ações (não imprime) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm print:hidden">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status:</span>
            <span className={cn(
              "inline-flex px-2.5 py-1 rounded-full text-xs font-medium border",
              STATUS_PRESTACAO_CORES[c.prestacao.status]
            )}>
              {STATUS_PRESTACAO_LABEL[c.prestacao.status]}
            </span>
            {c.prestacao.protocolo && (
              <span className="text-xs text-slate-600">
                · Protocolo <span className="font-mono">{c.prestacao.protocolo}</span>
              </span>
            )}
          </div>
        </div>
        <AcoesPrestacao id={c.prestacao.id} status={c.prestacao.status} />
      </div>

      {/* ============================================================ */}
      {/* CABEÇALHO DO RELATÓRIO (imprime) */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm print:border-0 print:shadow-none print:p-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              {ESCRITORIO.nomeFantasia} · {ESCRITORIO.crc}
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Prestação de Contas {TIPO_PRESTACAO_LABEL[c.prestacao.tipo]}
            </h1>
            <div className="text-sm text-slate-700 mt-2">
              Convênio <span className="font-mono font-semibold">{c.convenio.numero}</span>
              {c.orgao.sigla && <span> · {c.orgao.sigla}</span>}
            </div>
            <div className="text-sm text-slate-600">{c.osc.nome}</div>
            <div className="text-xs text-slate-500 mt-1 max-w-2xl">{c.convenio.objeto}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Período</div>
            <div className="text-sm font-semibold text-slate-800">
              {formatDate(c.prestacao.periodo_inicio)} – {formatDate(c.prestacao.periodo_fim)}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-2">Emitido em</div>
            <div className="text-sm text-slate-800">{formatDate(new Date(), "dd/MM/yyyy")}</div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. IDENTIFICAÇÃO */}
      {/* ============================================================ */}
      <Secao titulo="1. Identificação">
        <div className="grid gap-4 md:grid-cols-2 text-sm">
          <Bloco titulo="OSC">
            <div className="font-medium text-slate-800">{c.osc.nome}</div>
            <div className="text-slate-600 text-xs">CNPJ {formatCNPJ(c.osc.cnpj)}</div>
            {c.osc.responsavel && (
              <div className="text-slate-600 text-xs mt-1">Responsável: {c.osc.responsavel}</div>
            )}
            {c.convenio.gestor_osc && (
              <div className="text-slate-600 text-xs">Gestor OSC: {c.convenio.gestor_osc}</div>
            )}
          </Bloco>
          <Bloco titulo="Órgão concedente">
            <div className="font-medium text-slate-800">
              {c.orgao.sigla ? `${c.orgao.sigla} — ` : ""}{c.orgao.nome}
            </div>
            {c.orgao.fundo && <div className="text-slate-600 text-xs mt-1">{c.orgao.fundo}</div>}
            {c.convenio.gestor_publico && (
              <div className="text-slate-600 text-xs mt-1">Gestor público: {c.convenio.gestor_publico}</div>
            )}
          </Bloco>
        </div>
        <div className="grid gap-4 md:grid-cols-3 text-sm mt-3">
          <Bloco titulo="Vigência">
            <div className="text-slate-800">{formatDate(c.convenio.vigencia_inicio)} → {formatDate(c.convenio.vigencia_fim)}</div>
          </Bloco>
          <Bloco titulo="Valor total do convênio">
            <div className="font-semibold text-slate-900">{formatBRL(c.convenio.valor_total)}</div>
            <div className="text-slate-600 text-xs">
              Repasse {formatBRL(c.convenio.valor_repasse)} · Contrapartida {formatBRL(c.convenio.valor_contrapartida)}
            </div>
          </Bloco>
          <Bloco titulo="Conta bancária exclusiva (art. 51)">
            {c.convenio.banco && <div className="text-slate-800 text-xs">{c.convenio.banco}</div>}
            {c.convenio.agencia && <div className="text-slate-600 text-xs">Ag. {c.convenio.agencia}</div>}
            {c.convenio.conta_corrente && <div className="text-slate-600 text-xs">C/C {c.convenio.conta_corrente}</div>}
            {c.convenio.conta_aplicacao && <div className="text-slate-600 text-xs">Aplic. {c.convenio.conta_aplicacao}</div>}
          </Bloco>
        </div>
      </Secao>

      {/* ============================================================ */}
      {/* 2. RESUMO FINANCEIRO */}
      {/* ============================================================ */}
      <Secao titulo="2. Resumo financeiro do período">
        <div className="grid gap-3 md:grid-cols-4 print:grid-cols-4 print:gap-2">
          <Card titulo="Saldo inicial" valor={formatBRL(c.resumo.saldo_inicial)} icon={<Wallet size={12} />} />
          <Card titulo="Entradas" valor={formatBRL(c.resumo.total_entradas)} cor="text-emerald-700" sub={c.resumo.rendimentos > 0 ? `Rendimentos ${formatBRL(c.resumo.rendimentos)}` : undefined} />
          <Card titulo="Saídas" valor={formatBRL(c.resumo.total_saidas)} cor="text-red-600" sub={c.resumo.glosa_total > 0 ? `Glosa ${formatBRL(c.resumo.glosa_total)}` : undefined} />
          <Card titulo="Saldo final" valor={formatBRL(c.resumo.saldo_final)} cor="text-[#1e3a8a]" destaque />
        </div>
      </Secao>

      {/* ============================================================ */}
      {/* 3. EXECUÇÃO POR RUBRICA */}
      {/* ============================================================ */}
      <Secao titulo="3. Execução por rubrica" icon={<ListChecks size={14} />}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-300">
              <th className="text-left py-1.5 font-semibold text-slate-600 uppercase w-16">Cód.</th>
              <th className="text-left py-1.5 font-semibold text-slate-600 uppercase">Rubrica</th>
              <th className="text-left py-1.5 font-semibold text-slate-600 uppercase">Grupo</th>
              <th className="text-right py-1.5 font-semibold text-slate-600 uppercase">Previsto</th>
              <th className="text-right py-1.5 font-semibold text-slate-600 uppercase">Realizado</th>
              <th className="text-right py-1.5 font-semibold text-slate-600 uppercase">Glosa</th>
              <th className="text-right py-1.5 font-semibold text-slate-600 uppercase">Saldo</th>
              <th className="text-right py-1.5 font-semibold text-slate-600 uppercase w-12">%</th>
            </tr>
          </thead>
          <tbody>
            {c.rubricas.map((r) => (
              <tr key={r.codigo} className="border-b border-slate-100 last:border-0">
                <td className="py-1.5 font-mono text-slate-700">{r.codigo}</td>
                <td className="py-1.5 text-slate-800">
                  {r.nome}
                  {r.qtd > 0 && <span className="text-slate-500"> ({r.qtd})</span>}
                </td>
                <td className="py-1.5 text-slate-600 text-[10pt] print:text-[8pt]">{r.grupo ?? "—"}</td>
                <td className="py-1.5 text-right tabular-nums">{formatBRL(r.valor_previsto)}</td>
                <td className="py-1.5 text-right tabular-nums font-medium">{formatBRL(r.valor_realizado)}</td>
                <td className={cn("py-1.5 text-right tabular-nums", r.valor_glosado > 0 && "text-red-600 font-medium")}>
                  {r.valor_glosado > 0 ? formatBRL(r.valor_glosado) : "—"}
                </td>
                <td className={cn("py-1.5 text-right tabular-nums", r.saldo < 0 && "text-red-600")}>
                  {formatBRL(r.saldo)}
                </td>
                <td className="py-1.5 text-right text-slate-600">{r.pct.toFixed(0)}%</td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-400 font-bold">
              <td colSpan={3} className="py-1.5">Total</td>
              <td className="py-1.5 text-right tabular-nums">{formatBRL(c.rubricas.reduce((s, r) => s + r.valor_previsto, 0))}</td>
              <td className="py-1.5 text-right tabular-nums">{formatBRL(c.rubricas.reduce((s, r) => s + r.valor_realizado, 0))}</td>
              <td className="py-1.5 text-right tabular-nums">{formatBRL(c.rubricas.reduce((s, r) => s + r.valor_glosado, 0))}</td>
              <td className="py-1.5 text-right tabular-nums">{formatBRL(c.rubricas.reduce((s, r) => s + r.saldo, 0))}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </Secao>

      {/* ============================================================ */}
      {/* 4. EXECUÇÃO DAS METAS */}
      {/* ============================================================ */}
      <Secao titulo="4. Execução das metas (físico-financeira)" icon={<Target size={14} />}>
        <div className="space-y-2">
          {c.metas.map((m) => (
            <div key={m.id} className="border border-slate-200 rounded-lg p-3 text-xs print:rounded-none print:border-slate-300">
              <div className="flex items-start gap-2">
                <span className="bg-slate-100 text-slate-700 font-mono font-bold px-1.5 py-0.5 rounded text-[10pt] shrink-0">{m.codigo}</span>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800 text-[11pt] print:text-[10pt]">
                    {m.titulo.replace(/^OBJETIVO\s+\d+\s*[·\-]\s*/i, "")}
                  </div>
                  {m.indicador && <div className="text-slate-600 mt-0.5"><strong>Indicador:</strong> {m.indicador}</div>}
                  {m.quantidade_prevista !== null && m.unidade_medida && (
                    <div className="text-slate-600">
                      <strong>Meta física prevista:</strong> {m.quantidade_prevista.toLocaleString("pt-BR")} {m.unidade_medida}
                    </div>
                  )}
                  <div className="text-slate-700 mt-1">
                    <strong>Lançamentos vinculados:</strong> {m.qtd_lancamentos}
                    {m.valor_realizado > 0 && <span> · Total executado: {formatBRL(m.valor_realizado)}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10pt] print:text-[8pt] text-slate-500 italic mt-3">
          Execução física detalhada conforme relatório técnico anexo (listas de presença, atas e registros fotográficos).
        </p>
      </Secao>

      {/* ============================================================ */}
      {/* 5. CONCILIAÇÃO BANCÁRIA */}
      {/* ============================================================ */}
      <Secao titulo="5. Conciliação bancária" icon={<CheckCircle2 size={14} />}>
        <div className="grid gap-3 md:grid-cols-3 print:grid-cols-3 print:gap-2">
          <Card titulo="Total lançamentos" valor={String(c.conciliacao.total_lancamentos)} />
          <Card titulo="Conciliados" valor={String(c.conciliacao.conciliados)} cor="text-emerald-700" />
          <Card titulo="Pendentes" valor={String(c.conciliacao.pendentes)} cor={c.conciliacao.pendentes > 0 ? "text-amber-600" : "text-slate-700"} />
        </div>
        {c.conciliacao.pendentes > 0 && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-2 text-[11pt] print:text-[9pt] text-amber-900">
            ⚠️ Existem {c.conciliacao.pendentes} lançamentos não conciliados com o extrato bancário no período.
          </div>
        )}
      </Secao>

      {/* ============================================================ */}
      {/* 6. MOVIMENTAÇÃO DETALHADA */}
      {/* ============================================================ */}
      <Secao titulo={`6. Movimentação detalhada · ${c.lancamentos.length} lançamentos`} icon={<Receipt size={14} />}>
        {c.lancamentos.length === 0 ? (
          <p className="text-sm text-slate-500">Sem movimentação no período.</p>
        ) : (
          <table className="w-full text-xs print:text-[8pt]">
            <thead>
              <tr className="border-b border-slate-300">
                <th className="text-left py-1.5 font-semibold text-slate-600 uppercase">Data</th>
                <th className="text-left py-1.5 font-semibold text-slate-600 uppercase">Descrição</th>
                <th className="text-left py-1.5 font-semibold text-slate-600 uppercase">Fornecedor</th>
                <th className="text-left py-1.5 font-semibold text-slate-600 uppercase">Doc.</th>
                <th className="text-left py-1.5 font-semibold text-slate-600 uppercase">Rubrica</th>
                <th className="text-left py-1.5 font-semibold text-slate-600 uppercase">Meta</th>
                <th className="text-left py-1.5 font-semibold text-slate-600 uppercase">Tipo</th>
                <th className="text-left py-1.5 font-semibold text-slate-600 uppercase">Status</th>
                <th className="text-right py-1.5 font-semibold text-slate-600 uppercase">Valor</th>
              </tr>
            </thead>
            <tbody>
              {c.lancamentos.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 whitespace-nowrap text-slate-700">{formatDate(l.data_lancamento)}</td>
                  <td className="py-1.5 text-slate-800 max-w-[180px] truncate" title={l.descricao}>{l.descricao}</td>
                  <td className="py-1.5 text-slate-700 max-w-[120px] truncate">{l.fornecedor_nome ?? "—"}</td>
                  <td className="py-1.5 text-slate-700">{l.documento_numero ?? "—"}</td>
                  <td className="py-1.5 text-slate-700 font-mono">{l.categoria_codigo ?? "—"}</td>
                  <td className="py-1.5 text-slate-700 font-mono">{l.meta_codigo ?? "—"}</td>
                  <td className="py-1.5 text-slate-700">{TIPO_LABEL[l.tipo]}</td>
                  <td className="py-1.5 text-slate-700">{STATUS_LANC_LABEL[l.status]}</td>
                  <td className={cn(
                    "py-1.5 text-right font-semibold tabular-nums whitespace-nowrap",
                    TIPO_SINAL[l.tipo] === "+" ? "text-emerald-700" : "text-slate-800"
                  )}>
                    {TIPO_SINAL[l.tipo] !== "·" ? TIPO_SINAL[l.tipo] : ""}{formatBRL(l.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Secao>

      {/* ============================================================ */}
      {/* 7. GLOSAS */}
      {/* ============================================================ */}
      {c.glosados.length > 0 && (
        <Secao titulo={`7. Despesas glosadas · ${formatBRL(c.resumo.glosa_total)}`} icon={<AlertTriangle size={14} />}>
          <div className="space-y-2">
            {c.glosados.map((l) => (
              <div key={l.id} className="bg-red-50 border border-red-200 rounded p-2 text-xs">
                <div className="font-medium text-red-900">{formatDate(l.data_lancamento)} · {l.descricao}</div>
                <div className="text-red-700 mt-0.5">{l.fornecedor_nome ?? "—"} · {formatBRL(l.valor)}</div>
              </div>
            ))}
          </div>
        </Secao>
      )}

      {/* ============================================================ */}
      {/* 8. ANEXOS (não imprime) */}
      {/* ============================================================ */}
      <div className="print:hidden">
        <AnexosBloco
          convenioId={c.convenio.id}
          entidade="prestacao"
          entidadeId={c.prestacao.id}
          anexos={anexos}
          revalidatePath={`/prestacoes/${c.prestacao.id}`}
          titulo="Anexos da prestação (extratos, relatórios, comprovantes)"
        />
      </div>

      {/* Resumo de anexos no print */}
      <div className="hidden print:block">
        <Secao titulo={`8. Anexos da prestação · ${anexos.length}`} icon={<FileText size={14} />}>
          {anexos.length === 0 ? (
            <p className="text-xs text-slate-500">Sem anexos.</p>
          ) : (
            <ol className="list-decimal list-inside text-xs space-y-1">
              {anexos.map((a) => (
                <li key={a.id}>{a.nome}</li>
              ))}
            </ol>
          )}
        </Secao>
      </div>

      {/* Observações */}
      {c.prestacao.observacoes && (
        <Secao titulo="Observações">
          <p className="text-xs text-slate-700 whitespace-pre-line">{c.prestacao.observacoes}</p>
        </Secao>
      )}

      {/* Parecer técnico (se aprovada/rejeitada) */}
      {c.prestacao.parecer_tecnico && (
        <Secao titulo="Parecer técnico do órgão concedente">
          <p className="text-xs text-slate-700 whitespace-pre-line">{c.prestacao.parecer_tecnico}</p>
          {c.prestacao.analisada_em && (
            <p className="text-[11px] text-slate-500 mt-2">Analisada em {formatDate(c.prestacao.analisada_em)}</p>
          )}
        </Secao>
      )}

      {/* ============================================================ */}
      {/* DECLARAÇÃO + ASSINATURAS (só imprime) */}
      {/* ============================================================ */}
      <div className="hidden print:block">
        <div className="border-t border-slate-300 pt-4 text-xs text-slate-700 leading-relaxed">
          <p>
            Declaro, sob as penas da lei, que as informações constantes desta prestação de contas são verdadeiras
            e que os recursos foram aplicados conforme o Plano de Trabalho aprovado e as exigências da Lei Federal
            13.019/2014. Os documentos comprobatórios encontram-se à disposição para fiscalização.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-12 mt-12">
          <div className="text-center">
            <div className="border-t border-slate-800 pt-1">
              <strong>{ESCRITORIO.contador}</strong>
              <div className="text-xs">{ESCRITORIO.crc} — Contador responsável</div>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-slate-800 pt-1">
              <strong>{c.osc.responsavel ?? "Representante Legal"}</strong>
              <div className="text-xs">{c.osc.nome}</div>
            </div>
          </div>
        </div>
        <div className="text-center mt-6 text-[9pt] text-slate-600">
          {ESCRITORIO.nome} · CNPJ {ESCRITORIO.cnpj} · {ESCRITORIO.endereco}
        </div>
      </div>
    </div>
  );
}

function Secao({ titulo, icon, children }: { titulo: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm print:rounded print:shadow-none print:break-inside-avoid">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 mb-3 flex items-center gap-2">
        {icon}
        {titulo}
      </h2>
      {children}
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5">{titulo}</div>
      {children}
    </div>
  );
}

function Card({ titulo, valor, cor, sub, destaque, icon }: {
  titulo: string; valor: string; cor?: string; sub?: string; destaque?: boolean; icon?: React.ReactNode;
}) {
  return (
    <div className={cn(
      "bg-white border border-slate-200 rounded-2xl p-4 shadow-sm print:shadow-none print:rounded print:p-2",
      destaque && "border-[#1e3a8a]/30 ring-1 ring-[#1e3a8a]/20"
    )}>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
        {icon} {titulo}
      </div>
      <div className={cn("text-lg font-bold mt-1 tabular-nums", cor ?? "text-slate-900")}>{valor}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
