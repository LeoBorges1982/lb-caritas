import { notFound } from "next/navigation";
import { ShieldCheck, ShieldAlert, ShieldX, FileText } from "lucide-react";
import { consolidarPrestacao } from "@/lib/prestacoes";
import {
  listarAssinaturas,
  calcularHashPrestacao,
  montarStatusSignatarios,
  resumirAssinaturas,
  hashLegivel,
} from "@/lib/assinaturas";
import { ESCRITORIO } from "@/lib/constants";
import { formatBRL, formatDate, formatCNPJ, mascararCPF } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Página PÚBLICA de verificação de autenticidade — acessada pelo QR code
 * impresso no documento. Não exige login (liberada no middleware).
 */
export default async function VerificarPage({ params }: PageProps) {
  const { id } = await params;

  const c = await consolidarPrestacao(id).catch(() => null);
  if (!c) notFound();

  const assinaturas = await listarAssinaturas("prestacao", id);
  const hashAtual = calcularHashPrestacao(c);
  const signatarios = montarStatusSignatarios(c, assinaturas, hashAtual);
  const resumo = resumirAssinaturas(signatarios);

  const estado = resumo.assinadas === 0
    ? "sem_assinatura"
    : resumo.divergentes > 0
    ? "alterado"
    : resumo.completo
    ? "integro_completo"
    : "integro_parcial";

  const cor = {
    integro_completo: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", icone: <ShieldCheck size={28} /> },
    integro_parcial: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", icone: <ShieldAlert size={28} /> },
    alterado: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", icone: <ShieldX size={28} /> },
    sem_assinatura: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", icone: <FileText size={28} /> },
  }[estado];

  const titulo = {
    integro_completo: "Documento autêntico e íntegro",
    integro_parcial: "Documento íntegro — assinaturas pendentes",
    alterado: "Atenção: conteúdo alterado após a assinatura",
    sem_assinatura: "Documento ainda não assinado",
  }[estado];

  const descricao = {
    integro_completo: "Todas as assinaturas previstas foram coletadas e o conteúdo confere com o que foi assinado.",
    integro_parcial: "O conteúdo confere com o que foi assinado, mas nem todos os responsáveis assinaram até o momento.",
    alterado: "O conteúdo financeiro foi modificado depois que as assinaturas foram coletadas. As assinaturas marcadas abaixo não correspondem à versão atual.",
    sem_assinatura: "Este documento existe no sistema, mas ainda não recebeu assinaturas eletrônicas.",
  }[estado];

  return (
    <main className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-4">

        {/* Marca */}
        <div className="text-center">
          <div className="text-sm font-bold text-[#1e3a8a] uppercase tracking-wide">
            {ESCRITORIO.nomeFantasia}
          </div>
          <div className="text-xs text-slate-500">Verificação de autenticidade de documento</div>
        </div>

        {/* Resultado */}
        <div className={`${cor.bg} ${cor.border} border rounded-2xl p-6 flex items-start gap-4`}>
          <div className={cor.text}>{cor.icone}</div>
          <div>
            <h1 className={`text-lg font-bold ${cor.text}`}>{titulo}</h1>
            <p className={`text-sm mt-1 ${cor.text} opacity-90`}>{descricao}</p>
          </div>
        </div>

        {/* Identificação do documento */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Documento
          </h2>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 text-sm">
            <Campo rotulo="Tipo">
              Relatório de Execução Financeira ({c.prestacao.tipo === "final" ? "Final" : "Parcial"}
              {c.prestacao.numero_parcela ? ` · ${c.prestacao.numero_parcela}ª parcela` : ""})
            </Campo>
            <Campo rotulo="Período">
              {formatDate(c.prestacao.periodo_inicio)} a {formatDate(c.prestacao.periodo_fim)}
            </Campo>
            <Campo rotulo="Convênio">{c.convenio.numero}</Campo>
            <Campo rotulo="Órgão concedente">{c.orgao.sigla ?? c.orgao.nome}</Campo>
            <Campo rotulo="OSC">{c.osc.nome}</Campo>
            <Campo rotulo="CNPJ">{c.osc.cnpj ? formatCNPJ(c.osc.cnpj) : "—"}</Campo>
            <Campo rotulo="Total de receitas">{formatBRL(c.receita.total)}</Campo>
            <Campo rotulo="Saldo para o período seguinte">{formatBRL(c.despesa.saldo_proximo)}</Campo>
          </dl>
        </div>

        {/* Assinaturas */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Assinaturas eletrônicas
          </h2>
          <ul className="divide-y divide-slate-100">
            {signatarios.map((s) => (
              <li key={s.papel} className="py-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">{s.rotulo}</div>
                  <div className="text-sm font-medium text-slate-800">
                    {s.assinatura ? (s.nome ?? "—") : <span className="text-slate-400">aguardando assinatura</span>}
                  </div>
                  {/* Só publica dado de quem efetivamente assinou, e com o CPF
                      mascarado: a página serve para conferir autenticidade,
                      não para divulgar o documento de identidade de ninguém. */}
                  {s.assinatura && s.cpf && (
                    <div className="text-xs text-slate-500">CPF {mascararCPF(s.cpf)}</div>
                  )}
                  {s.assinatura && s.registro && (
                    <div className="text-xs text-slate-500">{s.registro}</div>
                  )}
                </div>
                <div className="text-right">
                  {s.assinatura ? (
                    s.divergente ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
                        <ShieldX size={12} /> Não confere
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
                        <ShieldCheck size={12} /> Assinado
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded-full">
                      Pendente
                    </span>
                  )}
                  {s.assinatura && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      {formatDate(s.assinatura.assinado_em, "dd/MM/yyyy 'às' HH:mm")}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Integridade */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Código de integridade (SHA-256)
          </h2>
          <code className="text-xs font-mono text-slate-700 break-all block">{hashLegivel(hashAtual, 16)}</code>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            Este código é calculado a partir de todo o conteúdo financeiro do documento. Se qualquer
            valor for alterado no sistema, o código muda e as assinaturas coletadas deixam de conferir.
            Assinatura eletrônica avançada nos termos do art. 4º, II, da Lei 14.063/2020, com autoria
            comprovada por acesso autenticado e integridade comprovada por resumo criptográfico.
          </p>
        </div>

        <div className="text-center text-xs text-slate-500 pt-2">
          {ESCRITORIO.nome} · CNPJ {ESCRITORIO.cnpj}<br />
          Consulta realizada em {formatDate(new Date(), "dd/MM/yyyy 'às' HH:mm")}
        </div>
      </div>
    </main>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{rotulo}</dt>
      <dd className="text-slate-800">{children}</dd>
    </div>
  );
}
