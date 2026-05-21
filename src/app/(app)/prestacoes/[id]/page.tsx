import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  consolidarPrestacao,
  STATUS_PRESTACAO_LABEL,
  STATUS_PRESTACAO_CORES,
  TIPO_PRESTACAO_LABEL,
} from "@/lib/prestacoes";
import { listarAnexos } from "@/lib/anexos";
import { formatBRL, formatDate, formatCNPJ, formatCPF, cn } from "@/lib/utils";
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
  const ehFinal = c.prestacao.tipo === "final";

  return (
    <div className="balancete max-w-6xl mx-auto space-y-4 text-[10pt]">
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
            <span className={cn("inline-flex px-2.5 py-1 rounded-full text-xs font-medium border", STATUS_PRESTACAO_CORES[c.prestacao.status])}>
              {STATUS_PRESTACAO_LABEL[c.prestacao.status]}
            </span>
            {c.prestacao.protocolo && (
              <span className="text-xs text-slate-600">· Protocolo <span className="font-mono">{c.prestacao.protocolo}</span></span>
            )}
          </div>
        </div>
        <AcoesPrestacao id={c.prestacao.id} status={c.prestacao.status} />
      </div>

      {/* ============================================================ */}
      {/* CABEÇALHO OFICIAL */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-400 print:border-black print:rounded-none rounded">
        <div className="grid grid-cols-[1fr_180px] border-b border-slate-400 print:border-black">
          <div className="p-3 flex items-center justify-center text-center">
            <h1 className="text-base font-bold text-slate-900 uppercase tracking-wide">
              Relatório de Execução Financeira
            </h1>
          </div>
          <div className="border-l border-slate-400 print:border-black grid grid-cols-2 text-[9pt]">
            <div className="p-2 border-r border-b border-slate-400 print:border-black">Final</div>
            <div className="p-2 border-b border-slate-400 print:border-black text-center font-bold">
              {ehFinal ? "X" : ""}
            </div>
            <div className="p-2 border-r border-b border-slate-400 print:border-black">Parcial</div>
            <div className="p-2 border-b border-slate-400 print:border-black text-center font-bold">
              {ehFinal ? "" : "X"}
            </div>
            <div className="p-2 border-r border-slate-400 print:border-black">Parcela</div>
            <div className="p-2 text-center font-bold">
              {c.prestacao.numero_parcela ? `${c.prestacao.numero_parcela}ª` : "—"}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-[140px_1fr] border-b border-slate-400 print:border-black">
          <div className="p-2 border-r border-slate-400 print:border-black text-[9pt]">Período</div>
          <div className="p-2 font-semibold">{formatDate(c.prestacao.periodo_inicio)} à {formatDate(c.prestacao.periodo_fim)}</div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1 — DADOS DA PARCEIRA */}
      {/* ============================================================ */}
      <SecaoTitulo numero="1">Dados da Parceira</SecaoTitulo>
      <div className="border border-slate-400 print:border-black grid grid-cols-[80px_1fr_60px_1fr_60px_1fr] text-[9pt]">
        <Cell label>OSC:</Cell>
        <Cell colSpan={3}>{c.osc.nome}</Cell>
        <Cell label>CNPJ:</Cell>
        <Cell>{c.osc.cnpj ? formatCNPJ(c.osc.cnpj) : "—"}</Cell>

        <Cell label>Endereço:</Cell>
        <Cell colSpan={3}>{c.osc.endereco ?? "—"}</Cell>
        <Cell label>CEP:</Cell>
        <Cell>{c.osc.cep ?? "—"}</Cell>

        <Cell label>Município</Cell>
        <Cell>{c.osc.cidade ?? "—"}</Cell>
        <Cell label>Telefone:</Cell>
        <Cell>{c.osc.telefone ?? "—"}</Cell>
        <Cell label>E-mail:</Cell>
        <Cell>{c.osc.email ?? "—"}</Cell>

        <Cell label>Resp. Técnico:</Cell>
        <Cell>{c.convenio.responsavel_tecnico_nome ?? "—"}</Cell>
        <Cell colSpan={2}>Função: {c.convenio.responsavel_tecnico_funcao ?? "—"}</Cell>
        <Cell colSpan={2}>E-mail: {c.convenio.responsavel_tecnico_email ?? "—"}</Cell>

        <Cell label>CPF:</Cell>
        <Cell>{c.convenio.responsavel_tecnico_cpf ?? "—"}</Cell>
        <Cell colSpan={4}></Cell>
      </div>

      {/* ============================================================ */}
      {/* 2 — DADOS DO INSTRUMENTO JURÍDICO */}
      {/* ============================================================ */}
      <SecaoTitulo numero="2">Dados do Instrumento Jurídico</SecaoTitulo>
      <div className="border border-slate-400 print:border-black grid grid-cols-[100px_140px_140px_1fr_120px_160px] text-[9pt]">
        <CellH>Processo</CellH>
        <CellH>Termo de Colaboração</CellH>
        <CellH>Termo Aditivo nº</CellH>
        <CellH>Título da Parceria (Objeto)</CellH>
        <CellH>Valor Global (R$)</CellH>
        <CellH>Vigência</CellH>

        <Cell>2024/103819</Cell>
        <Cell>{c.convenio.numero}</Cell>
        <Cell>—</Cell>
        <Cell>{c.convenio.objeto}</Cell>
        <Cell className="text-right font-semibold">{formatBRL(c.convenio.valor_total)}</Cell>
        <Cell className="text-center">{formatDate(c.convenio.vigencia_inicio)} à {formatDate(c.convenio.vigencia_fim)}</Cell>
      </div>

      {/* ============================================================ */}
      {/* 3 — DEMONSTRATIVOS FINANCEIROS */}
      {/* ============================================================ */}
      <SecaoTitulo>3 - Demonstrativos Financeiros</SecaoTitulo>

      {/* 3.1 Receita e Despesa */}
      <SecaoSubtitulo>3.1 — Demonstrativo da Receita e Despesa</SecaoSubtitulo>
      <div className="border border-slate-400 print:border-black grid grid-cols-[1fr_120px_1fr_120px_120px] text-[9pt]">
        <CellH>Receita</CellH>
        <CellH className="text-right">Valor</CellH>
        <CellH>Despesa</CellH>
        <CellH className="text-right">Valor</CellH>
        <CellH className="text-right">N.E.</CellH>

        <Cell>(A) Repasses Municipais no Período</Cell>
        <Cell className="text-right">{formatBRL(c.receita.repasses_municipais)}</Cell>
        <Cell label className="bg-slate-50">(1) Recursos Humanos</Cell>
        <Cell className="text-right font-semibold">{formatBRL(c.despesa.rh.total)}</Cell>
        <Cell className="text-right">{formatBRL(c.despesa.rh.total)}</Cell>

        <Cell>(B) Rendimentos de Repasses Municipais</Cell>
        <Cell className="text-right">{formatBRL(c.receita.rendimentos_aplicacao)}</Cell>
        {c.despesa.rh.linhas.slice(0, 1).map((l, i) => (
          <SubRubrica key={i} l={l} />
        ))}

        <Cell>(C) Recursos da OSC</Cell>
        <Cell className="text-right">{formatBRL(c.receita.recursos_osc)}</Cell>
        {c.despesa.rh.linhas[1] ? <SubRubrica l={c.despesa.rh.linhas[1]} /> : <EmptyRub />}

        <Cell>(D) Outras Receitas</Cell>
        <Cell className="text-right">{formatBRL(c.receita.outras_receitas)}</Cell>
        {c.despesa.rh.linhas[2] ? <SubRubrica l={c.despesa.rh.linhas[2]} /> : <EmptyRub />}

        <Cell>(E) Saldo do Período Anterior</Cell>
        <Cell className="text-right">{formatBRL(c.receita.saldo_periodo_anterior)}</Cell>
        {c.despesa.rh.linhas[3] ? <SubRubrica l={c.despesa.rh.linhas[3]} /> : <EmptyRub />}

        <Cell label className="bg-slate-50">Total (A+B+C+D+E)</Cell>
        <Cell className="text-right font-bold bg-slate-50">{formatBRL(c.receita.total)}</Cell>
        {c.despesa.rh.linhas[4] ? <SubRubrica l={c.despesa.rh.linhas[4]} /> : <EmptyRub />}

        <Cell colSpan={2}></Cell>
        <Cell label className="bg-slate-50">(2) Materiais de Consumo</Cell>
        <Cell className="text-right font-semibold">{formatBRL(c.despesa.materiais.total)}</Cell>
        <Cell className="text-right">{formatBRL(c.despesa.materiais.total)}</Cell>

        {c.despesa.materiais.linhas.map((l, i) => (
          <>
            <Cell colSpan={2}></Cell>
            <SubRubrica key={`m${i}`} l={l} />
          </>
        ))}

        <Cell colSpan={2}></Cell>
        <Cell label className="bg-slate-50">(3) Prestação de Serviços</Cell>
        <Cell className="text-right font-semibold">{formatBRL(c.despesa.servicos.total)}</Cell>
        <Cell className="text-right">{formatBRL(c.despesa.servicos.total)}</Cell>

        {c.despesa.servicos.linhas.map((l, i) => (
          <>
            <Cell colSpan={2}></Cell>
            <SubRubrica key={`s${i}`} l={l} />
          </>
        ))}

        <Cell colSpan={2}></Cell>
        <Cell label className="bg-slate-50">(4) Locação de Bens</Cell>
        <Cell className="text-right font-semibold">{formatBRL(c.despesa.locacao.total)}</Cell>
        <Cell className="text-right">{formatBRL(c.despesa.locacao.total)}</Cell>

        {c.despesa.locacao.linhas.map((l, i) => (
          <>
            <Cell colSpan={2}></Cell>
            <SubRubrica key={`l${i}`} l={l} />
          </>
        ))}

        <Cell colSpan={2}></Cell>
        <Cell>(5) Outras Despesas</Cell>
        <Cell className="text-right">{formatBRL(c.despesa.outras)}</Cell>
        <Cell className="text-right">{formatBRL(c.despesa.outras_ne)}</Cell>

        <Cell colSpan={2}></Cell>
        <Cell>(6) Valores Devolvidos ao Município</Cell>
        <Cell className="text-right">{formatBRL(c.despesa.devolvido)}</Cell>
        <Cell className="text-right">{formatBRL(c.despesa.devolvido_ne)}</Cell>

        <Cell colSpan={2}></Cell>
        <Cell>(7) Saldo para o Próximo Período</Cell>
        <Cell className="text-right font-semibold">{formatBRL(c.despesa.saldo_proximo)}</Cell>
        <Cell className="text-right">{formatBRL(c.despesa.saldo_proximo_ne)}</Cell>

        <Cell colSpan={2}></Cell>
        <Cell label className="bg-slate-100">Total (1+2+3+4+5+6+7)</Cell>
        <Cell className="text-right font-bold bg-slate-100">{formatBRL(c.despesa.total)}</Cell>
        <Cell className="text-right font-bold bg-slate-100">{formatBRL(c.despesa.total_ne)}</Cell>
      </div>

      {/* 3.2 Conciliação Bancária */}
      <SecaoSubtitulo>3.2 - Conciliação Bancária</SecaoSubtitulo>
      <div className="border border-slate-400 print:border-black grid grid-cols-[80px_1fr_100px_140px_120px] text-[9pt]">
        <CellH>Banco</CellH>
        <CellH>{c.convenio.banco ?? "—"}</CellH>
        <CellH>Agência: {c.convenio.agencia ?? "—"}</CellH>
        <CellH>Conta Bancária:</CellH>
        <CellH>{c.convenio.conta_corrente ?? "—"}</CellH>

        <Cell colSpan={4}>(A) Saldo no Extrato Bancário em: {formatDate(c.conciliacao.data_extrato)}</Cell>
        <Cell className="text-right">{formatBRL(c.conciliacao.saldo_extrato)}</Cell>

        <Cell label colSpan={5}>(B) Total de Créditos Pendentes</Cell>
        <LinhaPenden label="Repasses Municipais no Período" valor={c.conciliacao.creditos_pendentes_repasses} />
        <LinhaPenden label="Rendimentos de Repasses Municipais" valor={c.conciliacao.creditos_pendentes_rendimentos} />
        <LinhaPenden label="Recursos da OSC" valor={c.conciliacao.creditos_pendentes_osc} />
        <LinhaPenden label="Outras Receitas (Especificar em nota explicativa)" valor={c.conciliacao.creditos_pendentes_outras} />

        <Cell label colSpan={5}>(C) Total de Débitos Pendentes</Cell>
        <LinhaPenden label="Recursos Humanos" valor={c.conciliacao.debitos_pendentes_rh} />
        <LinhaPenden label="Materiais de Consumo" valor={c.conciliacao.debitos_pendentes_materiais} />
        <LinhaPenden label="Locação de Bens" valor={c.conciliacao.debitos_pendentes_locacao} />
        <LinhaPenden label="Prestação de Serviços" valor={c.conciliacao.debitos_pendentes_servicos} />
        <LinhaPenden label="Outras Despesas (especificar em nota explicativa)" valor={c.conciliacao.debitos_pendentes_outras} />

        <Cell label colSpan={4} className="bg-slate-100">(A+B+C) = Saldo Contábil em: {formatDate(c.conciliacao.data_extrato)}</Cell>
        <Cell className="text-right font-bold bg-slate-100">{formatBRL(c.conciliacao.saldo_contabil)}</Cell>
      </div>

      {/* 3.3 Relação de Pagamentos */}
      <SecaoSubtitulo>3.3 - Relação de Pagamentos</SecaoSubtitulo>

      <TabelaPagamentos titulo="3.3.1 — Recursos Humanos" linhas={c.pagamentos.rh} colItem="Itens de Orçamento" />
      <TabelaPagamentos titulo="3.3.2 — Materiais de Consumo" linhas={c.pagamentos.materiais} colItem="Itens de Orçamento" />
      <TabelaPagamentos titulo="3.3.3 — Prestação de Serviços" linhas={c.pagamentos.servicos} colItem="Itens de Orçamento" />
      <TabelaPagamentos titulo="3.3.4 — Locação de Bens" linhas={c.pagamentos.locacao} colItem="Itens de Orçamento" />
      <TabelaPagamentos titulo="3.3.5 — Outras Despesas" linhas={c.pagamentos.outras} colItem="Descrição" />
      <TabelaPagamentos titulo="3.3.6 — Valores Devolvidos ao Município" linhas={c.pagamentos.devolvidos} colItem="Motivo" />

      <div className="border border-slate-400 print:border-black grid grid-cols-[1fr_140px] text-[9pt] bg-slate-100">
        <Cell label>Total Geral (3.3.1+3.3.2+3.3.3+3.3.4+3.3.5+3.3.6)</Cell>
        <Cell className="text-right font-bold">{formatBRL(c.pagamentos.total)}</Cell>
      </div>

      {/* 3.4 Bens Permanentes */}
      <SecaoSubtitulo>3.4 — Relação de Bens Permanentes Adquiridos</SecaoSubtitulo>
      <div className="border border-slate-400 print:border-black grid grid-cols-4 text-[9pt]">
        <CellH>Data</CellH>
        <CellH>Fonte de Recursos</CellH>
        <CellH className="text-right">Valor Unitário (R$)</CellH>
        <CellH className="text-right">Valor Total (R$)</CellH>
        <Cell colSpan={4} className="text-center text-slate-500 italic">Nenhum bem permanente adquirido no período.</Cell>
      </div>

      {/* ============================================================ */}
      {/* 4 — ACOMPANHAMENTO DA EXECUÇÃO FINANCEIRA */}
      {/* ============================================================ */}
      <SecaoTitulo numero="4">Acompanhamento da Execução Financeira</SecaoTitulo>
      <div className="border border-slate-400 print:border-black grid grid-cols-[140px_1fr_100px_100px_100px_100px_100px_100px_100px] text-[9pt]">
        <CellH rowSpan={2}>Descrição</CellH>
        <CellH rowSpan={2}></CellH>
        <CellH rowSpan={2}>Previsto Mensal</CellH>
        <CellH colSpan={2}>Realizado no Período (R$)</CellH>
        <CellH rowSpan={2}>Previsto Acumulado</CellH>
        <CellH colSpan={3}>Realizado até o Período (R$)</CellH>

        <CellH>Executado Concedente</CellH>
        <CellH>Total</CellH>
        <CellH>Executado Concedente</CellH>
        <CellH>OSC</CellH>
        <CellH>Total</CellH>

        {c.acompanhamento.linhas.map((l) => (
          <>
            <Cell key={`${l.codigo}-cod`} className="font-mono">{l.codigo}</Cell>
            <Cell key={`${l.codigo}-nome`}>{l.nome}</Cell>
            <Cell key={`${l.codigo}-pm`} className="text-right">{formatBRL(l.previsto_mensal)}</Cell>
            <Cell key={`${l.codigo}-epc`} className="text-right">{formatBRL(l.executado_periodo_concedente)}</Cell>
            <Cell key={`${l.codigo}-ept`} className="text-right font-semibold">{formatBRL(l.executado_periodo_total)}</Cell>
            <Cell key={`${l.codigo}-pa`} className="text-right">{formatBRL(l.previsto_acumulado)}</Cell>
            <Cell key={`${l.codigo}-eac`} className="text-right">{formatBRL(l.executado_acumulado_concedente)}</Cell>
            <Cell key={`${l.codigo}-eao`} className="text-right">{formatBRL(l.executado_acumulado_osc)}</Cell>
            <Cell key={`${l.codigo}-eat`} className="text-right font-semibold">{formatBRL(l.executado_acumulado_total)}</Cell>
          </>
        ))}

        <Cell label colSpan={4} className="bg-slate-100">Total das Despesas</Cell>
        <Cell className="text-right font-bold bg-slate-100">{formatBRL(c.acompanhamento.total_periodo)}</Cell>
        <Cell colSpan={3} className="bg-slate-100"></Cell>
        <Cell className="text-right font-bold bg-slate-100">{formatBRL(c.acompanhamento.total_acumulado)}</Cell>
      </div>

      {/* ============================================================ */}
      {/* 5 — NOTAS EXPLICATIVAS */}
      {/* ============================================================ */}
      <SecaoTitulo numero="5">Notas Explicativas (N.E.)</SecaoTitulo>
      <div className="border border-slate-400 print:border-black p-3 text-[9pt] space-y-2">
        <p>1-(3.2) Utilidades Públicas — Neste Campo indicar o valor referente a despesa com energia elétrica, água e esgoto, gás, telefone e internet.</p>
        {c.prestacao.observacoes && (
          <p className="whitespace-pre-line text-slate-700">{c.prestacao.observacoes}</p>
        )}
        <p className="italic text-slate-500">* Neste campo a OSC deverá inserir notas explicativas contendo informações relevantes que complementem a compreensão das informações contidas na planilha.</p>
      </div>

      {/* ============================================================ */}
      {/* 6 — ASSINATURAS */}
      {/* ============================================================ */}
      <SecaoTitulo numero="6">Assinaturas</SecaoTitulo>
      <div className="border border-slate-400 print:border-black grid grid-cols-[160px_1fr_100px_140px_80px_1fr] text-[9pt]">
        <CellH colSpan={6}>Responsável da OSC Gestor</CellH>
        <Cell label>Nome:</Cell>
        <Cell>{c.convenio.gestor_osc ?? "—"}</Cell>
        <Cell label>CPF nº</Cell>
        <Cell>{c.convenio.gestor_osc_cpf ?? "—"}</Cell>
        <Cell label>Data</Cell>
        <Cell>{formatDate(c.prestacao.criado_em)} <span className="text-slate-400 ml-2">Assinatura</span></Cell>

        <CellH colSpan={6}>Responsável pela Elaboração</CellH>
        <Cell label>Nome:</Cell>
        <Cell>{c.convenio.elaborador_nome ?? "—"}</Cell>
        <Cell label>CPF nº</Cell>
        <Cell>{c.convenio.elaborador_cpf ?? "—"}</Cell>
        <Cell label>Data</Cell>
        <Cell>{formatDate(c.prestacao.criado_em)} <span className="text-slate-400 ml-2">Assinatura</span></Cell>

        <CellH colSpan={6}>Responsável Legal da OSC</CellH>
        <Cell label>Nome:</Cell>
        <Cell>{c.convenio.responsavel_legal_nome ?? "—"}</Cell>
        <Cell label>CPF nº</Cell>
        <Cell>{c.convenio.responsavel_legal_cpf ?? "—"}</Cell>
        <Cell label>Data</Cell>
        <Cell>{formatDate(c.prestacao.criado_em)} <span className="text-slate-400 ml-2">Assinatura</span></Cell>

        <CellH colSpan={6}>Contabilista Responsável</CellH>
        <Cell label>Nome:</Cell>
        <Cell>{c.convenio.contabilista_nome ?? "—"} <span className="text-slate-500 ml-2">{c.convenio.contabilista_crc}</span></Cell>
        <Cell label>CPF nº</Cell>
        <Cell>{c.convenio.contabilista_cpf ?? "—"}</Cell>
        <Cell label>Data</Cell>
        <Cell>{formatDate(c.prestacao.criado_em)} <span className="text-slate-400 ml-2">Assinatura</span></Cell>
      </div>

      {/* ============================================================ */}
      {/* ANEXOS (não imprime) */}
      {/* ============================================================ */}
      <div className="print:hidden">
        <AnexosBloco
          convenioId={c.convenio.id}
          entidade="prestacao"
          entidadeId={c.prestacao.id}
          anexos={anexos}
          revalidatePath={`/prestacoes/${c.prestacao.id}`}
          titulo="Anexos (extratos, relatórios, comprovantes)"
        />
      </div>
    </div>
  );
}

// ============================================================================
// Componentes auxiliares
// ============================================================================
function SecaoTitulo({ numero, children }: { numero?: string; children: React.ReactNode }) {
  return (
    <h2 className="text-[10pt] font-bold uppercase tracking-wide text-slate-900 mt-4 mb-1 print:mt-3">
      {numero && <span className="mr-1">{numero} —</span>}{children}
    </h2>
  );
}

function SecaoSubtitulo({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10pt] font-semibold text-slate-800 mt-3 mb-1 bg-slate-100 px-2 py-1 print:bg-slate-200">
      {children}
    </h3>
  );
}

interface CellProps {
  children?: React.ReactNode;
  label?: boolean;
  className?: string;
  colSpan?: number;
  rowSpan?: number;
}

function Cell({ children, label, className, colSpan, rowSpan }: CellProps) {
  const span = colSpan ? `col-span-${colSpan}` : "";
  const row = rowSpan ? `row-span-${rowSpan}` : "";
  return (
    <div
      className={cn(
        "border-r border-b border-slate-400 print:border-black p-1.5 text-[9pt]",
        label && "font-semibold bg-slate-50",
        span, row,
        className
      )}
      style={colSpan ? { gridColumn: `span ${colSpan} / span ${colSpan}` } : undefined}
    >
      {children}
    </div>
  );
}

function CellH({ children, className, colSpan, rowSpan }: CellProps) {
  return (
    <div
      className={cn(
        "border-r border-b border-slate-400 print:border-black p-1.5 text-[9pt] font-semibold bg-slate-100 print:bg-slate-200 uppercase tracking-tight",
        className
      )}
      style={{
        ...(colSpan ? { gridColumn: `span ${colSpan} / span ${colSpan}` } : {}),
        ...(rowSpan ? { gridRow: `span ${rowSpan} / span ${rowSpan}` } : {}),
      }}
    >
      {children}
    </div>
  );
}

function SubRubrica({ l }: { l: { codigo: string; nome: string; valor: number; valor_ne: number } }) {
  return (
    <>
      <Cell className="pl-6">({l.codigo}) {l.nome}</Cell>
      <Cell className="text-right">{formatBRL(l.valor)}</Cell>
      <Cell className="text-right">{formatBRL(l.valor_ne)}</Cell>
    </>
  );
}
function EmptyRub() {
  return (
    <>
      <Cell></Cell>
      <Cell></Cell>
      <Cell></Cell>
    </>
  );
}

function LinhaPenden({ label, valor }: { label: string; valor: number }) {
  return (
    <>
      <Cell colSpan={4}>{label}</Cell>
      <Cell className="text-right">{formatBRL(valor)}</Cell>
    </>
  );
}

function TabelaPagamentos({ titulo, linhas, colItem }: { titulo: string; linhas: { data: string; credor: string; cpf_cnpj: string | null; item_orcamento: string; nf_rec: string | null; ob: string | null; valor: number }[]; colItem: string }) {
  const total = linhas.reduce((s, l) => s + l.valor, 0);
  return (
    <div className="mt-2">
      <div className="bg-slate-50 px-2 py-1 text-[9pt] font-semibold border border-b-0 border-slate-400 print:border-black">{titulo}</div>
      <div className="border border-slate-400 print:border-black grid grid-cols-[80px_1fr_120px_1fr_100px_100px_100px] text-[9pt]">
        <CellH>Data</CellH>
        <CellH>Credor</CellH>
        <CellH>CPF / CNPJ nº</CellH>
        <CellH>{colItem}</CellH>
        <CellH>NF/Rec. nº</CellH>
        <CellH>O.B. nº</CellH>
        <CellH className="text-right">Valor (R$)</CellH>
        {linhas.length === 0 ? (
          <Cell colSpan={7} className="text-center text-slate-500 italic">Sem lançamentos no período.</Cell>
        ) : (
          linhas.map((l, i) => (
            <>
              <Cell key={`d${i}`}>{formatDate(l.data)}</Cell>
              <Cell key={`c${i}`}>{l.credor}</Cell>
              <Cell key={`cpf${i}`}>{l.cpf_cnpj ? (l.cpf_cnpj.replace(/\D/g, "").length === 14 ? formatCNPJ(l.cpf_cnpj) : formatCPF(l.cpf_cnpj)) : "—"}</Cell>
              <Cell key={`it${i}`}>{l.item_orcamento}</Cell>
              <Cell key={`nf${i}`}>{l.nf_rec ?? "—"}</Cell>
              <Cell key={`ob${i}`}>{l.ob ?? "—"}</Cell>
              <Cell key={`v${i}`} className="text-right font-semibold">{formatBRL(l.valor)}</Cell>
            </>
          ))
        )}
        <Cell label colSpan={6} className="bg-slate-100">Total {titulo.split("—")[0]?.trim()}</Cell>
        <Cell className="text-right font-bold bg-slate-100">{formatBRL(total)}</Cell>
      </div>
    </div>
  );
}
