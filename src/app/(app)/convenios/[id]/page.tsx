import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Building2, Landmark, Calendar, Wallet,
  Target, ListChecks, ShieldAlert, Receipt, Banknote, Users
} from "lucide-react";
import { buscarConvenio, STATUS_LABEL, STATUS_CORES, TIPO_LABEL } from "@/lib/convenios";
import { listarAnexos } from "@/lib/anexos";
import { formatBRL, formatDate, formatCNPJ, diasAteVigencia, cn } from "@/lib/utils";
import AnexosBloco from "@/components/AnexosBloco";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConvenioDetalhePage({ params }: PageProps) {
  const { id } = await params;
  const c = await buscarConvenio(id);

  if (!c) notFound();

  const anexos = await listarAnexos("convenio", c.id);

  const diasRestantes = diasAteVigencia(c.vigencia_fim);
  const venceu = diasRestantes !== null && diasRestantes < 0;
  const proximoVencimento = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 90;
  const executado = c.valor_total > 0 ? (c.saldo.total_saidas / c.valor_total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/convenios"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a] transition"
        >
          <ArrowLeft size={14} /> Voltar para Convênios
        </Link>
        <Link
          href={`/convenios/${c.id}/acessos`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#1e3a8a] bg-white border border-slate-300 px-3 py-1.5 rounded-lg"
        >
          <Users size={14} /> Gerenciar acessos
        </Link>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] rounded-2xl p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-bold">{c.numero}</span>
              <span className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-white",
                STATUS_CORES[c.status]
              )}>
                {STATUS_LABEL[c.status]}
              </span>
            </div>
            <div className="text-blue-200 text-sm mt-1">{TIPO_LABEL[c.tipo] ?? c.tipo} · Lei 13.019/2014</div>
            <p className="mt-4 text-base text-white/90 max-w-3xl leading-relaxed">{c.objeto}</p>
            {c.publico_alvo && (
              <p className="mt-2 text-sm text-blue-100">
                <strong className="font-semibold">Público-alvo:</strong> {c.publico_alvo}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-blue-200">Valor total</div>
            <div className="text-3xl font-bold mt-1">{formatBRL(c.valor_total)}</div>
            <div className="text-xs text-blue-200 mt-2">{executado.toFixed(1)}% executado</div>
          </div>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card icon={<Wallet size={16} />} titulo="Saldo atual" valor={formatBRL(c.saldo.saldo_atual)} sub={`Entradas ${formatBRL(c.saldo.total_entradas)} · Saídas ${formatBRL(c.saldo.total_saidas)}`} />
        <Card
          icon={<Calendar size={16} />}
          titulo="Vigência"
          valor={`${formatDate(c.vigencia_inicio)} → ${formatDate(c.vigencia_fim)}`}
          sub={
            venceu ? `Vencido há ${Math.abs(diasRestantes!)} dias` :
            proximoVencimento ? `Vence em ${diasRestantes} dias` :
            diasRestantes !== null ? `${diasRestantes} dias restantes` : ""
          }
          subClass={venceu ? "text-red-600 font-medium" : proximoVencimento ? "text-amber-600 font-medium" : ""}
        />
        <Card icon={<Banknote size={16} />} titulo="Repasse / Contrapartida" valor={`${formatBRL(c.valor_repasse)} / ${formatBRL(c.valor_contrapartida)}`} sub={c.rendimentos > 0 ? `Rendimentos: ${formatBRL(c.rendimentos)}` : "Sem rendimentos registrados"} />
        <Card icon={<Receipt size={16} />} titulo="Lançamentos" valor={String(c.counts.lancamentos)} sub={`${c.counts.metas} metas · ${c.counts.categorias} rubricas`} />
      </div>

      {/* Partes */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            <Building2 size={14} /> OSC
          </div>
          <div className="text-base font-semibold text-slate-900">{c.osc.nome}</div>
          <div className="text-sm text-slate-600 mt-1">CNPJ {formatCNPJ(c.osc.cnpj)}</div>
          {c.osc.cidade && (
            <div className="text-sm text-slate-500 mt-1">{c.osc.cidade}/{c.osc.estado}</div>
          )}
          {c.osc.responsavel && (
            <div className="text-sm text-slate-600 mt-2">
              <span className="text-slate-500">Responsável: </span>{c.osc.responsavel}
            </div>
          )}
          {c.gestor_osc && (
            <div className="text-sm text-slate-600 mt-1">
              <span className="text-slate-500">Gestor OSC: </span>{c.gestor_osc}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            <Landmark size={14} /> Órgão concedente
          </div>
          <div className="text-base font-semibold text-slate-900">
            {c.orgao.sigla ? `${c.orgao.sigla} — ` : ""}{c.orgao.nome}
          </div>
          <div className="text-sm text-slate-600 mt-1 capitalize">Esfera {c.orgao.esfera}</div>
          {c.orgao.fundo && (
            <div className="text-sm text-slate-600 mt-1">{c.orgao.fundo}</div>
          )}
          {c.gestor_publico && (
            <div className="text-sm text-slate-600 mt-2">
              <span className="text-slate-500">Gestor público: </span>{c.gestor_publico}
            </div>
          )}
        </div>
      </div>

      {/* Conta bancária */}
      {(c.banco || c.conta_corrente) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            <Banknote size={14} /> Conta bancária exclusiva (Lei 13.019, art. 51)
          </div>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div>
              <div className="text-slate-500">Banco</div>
              <div className="text-slate-800 font-medium">{c.banco ?? "—"}</div>
              <div className="text-slate-600 text-xs mt-0.5">Agência {c.agencia ?? "—"}</div>
            </div>
            <div>
              <div className="text-slate-500">Conta corrente</div>
              <div className="text-slate-800 font-medium">{c.conta_corrente ?? "—"}</div>
            </div>
            <div>
              <div className="text-slate-500">Conta aplicação</div>
              <div className="text-slate-800 font-medium">{c.conta_aplicacao ?? "—"}</div>
            </div>
          </div>
        </div>
      )}

      {/* Seções (placeholders linkados) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SecaoLink icon={<Target size={16} />} titulo="Plano de Trabalho" qtd={c.counts.metas} legenda={`${c.counts.metas} metas`} href={`/convenios/${c.id}/metas`} />
        <SecaoLink icon={<ListChecks size={16} />} titulo="Rubricas" qtd={c.counts.categorias} legenda="Plano de custos" href={`/convenios/${c.id}/rubricas`} />
        <SecaoLink icon={<Receipt size={16} />} titulo="Lançamentos" qtd={c.counts.lancamentos} legenda="Movimentação financeira" href={`/lancamentos?convenio_id=${c.id}`} />
        <SecaoLink icon={<ShieldAlert size={16} />} titulo="Vedações" qtd={c.counts.vedacoes} legenda="Itens proibidos" href={`/convenios/${c.id}/vedacoes`} />
      </div>

      <AnexosBloco
        convenioId={c.id}
        entidade="convenio"
        entidadeId={c.id}
        anexos={anexos}
        revalidatePath={`/convenios/${c.id}`}
        titulo="Documentos do convênio"
      />

      {c.observacoes && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Observações</div>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{c.observacoes}</p>
        </div>
      )}
    </div>
  );
}

function Card({ icon, titulo, valor, sub, subClass }: {
  icon: React.ReactNode;
  titulo: string;
  valor: string;
  sub?: string;
  subClass?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
        {icon} {titulo}
      </div>
      <div className="text-lg font-semibold text-slate-900">{valor}</div>
      {sub && <div className={cn("text-xs text-slate-500 mt-1", subClass)}>{sub}</div>}
    </div>
  );
}

function SecaoLink({ icon, titulo, qtd, legenda, href, disabled }: {
  icon: React.ReactNode;
  titulo: string;
  qtd: number;
  legenda: string;
  href: string;
  disabled?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {icon} {titulo}
        </div>
        <div className="text-2xl font-bold text-slate-900">{qtd}</div>
      </div>
      <div className="text-xs text-slate-500">{legenda}</div>
      {disabled && <div className="text-[10px] text-slate-400 mt-1 italic">em construção</div>}
    </>
  );

  if (disabled) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm opacity-70">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-[#1e3a8a]/40 hover:shadow-md transition"
    >
      {content}
    </Link>
  );
}
