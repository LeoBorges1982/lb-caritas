import { notFound } from "next/navigation";
import { ShieldAlert, FileText, PenLine } from "lucide-react";
import { consolidarPrestacao } from "@/lib/prestacoes";
import {
  calcularHashPrestacao,
  hashLegivel,
  listarAssinaturas,
  montarStatusSignatarios,
  PAPEL_ASSINATURA_LABEL,
} from "@/lib/assinaturas";
import {
  buscarConvitePorToken,
  motivoInvalido,
  MOTIVO_LABEL,
} from "@/lib/convites";
import { ESCRITORIO } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import PrestacaoOficial from "@/components/PrestacaoOficial";
import AssinarForm from "./AssinarForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

/**
 * Página PÚBLICA de assinatura — acessada pelo link enviado a cada
 * responsável. Não exige login: a identidade é confirmada pelo CPF.
 */
export default async function AssinarPage({ params }: PageProps) {
  const { token } = await params;

  const convite = await buscarConvitePorToken(token);
  if (!convite) notFound();

  const c = await consolidarPrestacao(convite.entidade_id).catch(() => null);
  if (!c) notFound();

  const hashAtual = calcularHashPrestacao(c);
  const signatarios = montarStatusSignatarios(
    c,
    await listarAssinaturas("prestacao", convite.entidade_id),
    hashAtual
  );
  const agora = new Date().toISOString();
  const invalido = motivoInvalido(convite, hashAtual, agora);
  const papelLabel = PAPEL_ASSINATURA_LABEL[convite.papel];

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Cabeçalho */}
      <header className="bg-[#1e3a8a] text-white">
        <div className="max-w-3xl mx-auto px-5 py-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-blue-200">
            <PenLine size={13} />
            Assinatura eletrônica
          </div>
          <h1 className="text-lg font-semibold mt-1">
            {c.osc.nome || "Prestação de contas"}
          </h1>
          <p className="text-sm text-blue-100 mt-0.5">
            Convênio {c.convenio.numero} · período de{" "}
            {formatDate(c.prestacao.periodo_inicio, "dd/MM/yyyy")} a{" "}
            {formatDate(c.prestacao.periodo_fim, "dd/MM/yyyy")}
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">
        {invalido ? (
          <div className="bg-white border border-amber-300 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <ShieldAlert size={22} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-base font-semibold text-slate-800">
                  Este link não pode ser usado
                </h2>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                  {MOTIVO_LABEL[invalido]}
                </p>
                {invalido === "ja_usado" && convite.usado_em && (
                  <p className="text-xs text-slate-500 mt-3">
                    Assinado em {formatDate(convite.usado_em, "dd/MM/yyyy 'às' HH:mm")}.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Convite */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong>{convite.nome}</strong>, você foi convidado a assinar a
                prestação de contas abaixo como{" "}
                <strong>{papelLabel}</strong>.
              </p>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Leia o documento e, ao final, confirme seu CPF para assinar.
              </p>
              <p className="text-[11px] text-slate-500 mt-3">
                Link válido até {formatDate(convite.expira_em, "dd/MM/yyyy")}.
              </p>
            </div>

            {/* Documento a ser assinado */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                <FileText size={15} className="text-slate-500" />
                <span className="text-sm font-medium text-slate-700">
                  Documento que você vai assinar
                </span>
              </div>
              <div className="p-5 overflow-x-auto">
                <div className="min-w-[640px]">
                  <PrestacaoOficial c={c} signatarios={signatarios} />
                </div>
              </div>
            </div>

            <AssinarForm
              token={token}
              nome={convite.nome}
              papelLabel={papelLabel}
            />

            <div className="text-center">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Código de integridade do documento (SHA-256)
              </p>
              <code className="text-[11px] font-mono text-slate-600 break-all">
                {hashLegivel(hashAtual)}
              </code>
            </div>
          </>
        )}

        <footer className="text-center text-[11px] text-slate-500 pt-2 pb-6 leading-relaxed">
          Assinatura eletrônica avançada nos termos do art. 4º, II da Lei
          14.063/2020.
          <br />
          {ESCRITORIO.nome}
        </footer>
      </div>
    </div>
  );
}
