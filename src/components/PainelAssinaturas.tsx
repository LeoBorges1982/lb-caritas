"use client";

import { useState, useTransition } from "react";
import {
  PenLine, ShieldCheck, ShieldAlert, Loader2, RotateCcw, Copy, Check,
  Link2, Send, X,
} from "lucide-react";
import { revogarAssinatura } from "@/app/(app)/prestacoes/[id]/assinaturas-actions";
import { gerarConvites, regerarConvite, cancelarConvite } from "@/app/(app)/prestacoes/[id]/convites-actions";
import { hashLegivel, type SignatarioStatus, type ResumoAssinaturas, type PapelAssinatura } from "@/lib/assinaturas";
import { formatDate, formatCPF, cn } from "@/lib/utils";

export interface ConviteResumo {
  id: string;
  papel: PapelAssinatura;
  url: string;
  expira_em: string;
  criado_em: string;
}

interface Props {
  prestacaoId: string;
  hashAtual: string;
  signatarios: SignatarioStatus[];
  resumo: ResumoAssinaturas;
  urlVerificacao: string;
  convites: ConviteResumo[];
}

export default function PainelAssinaturas({
  prestacaoId, hashAtual, signatarios, resumo, urlVerificacao, convites,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const conviteDe = (papel: PapelAssinatura) => convites.find((c) => c.papel === papel);

  function rodar(chave: string, fn: () => Promise<void>) {
    setErro(null);
    setOcupado(chave);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro inesperado");
      } finally {
        setOcupado(null);
      }
    });
  }

  async function copiar(texto: string, chave: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(chave);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      setErro("Não foi possível copiar. O link é: " + texto);
    }
  }

  function handleRevogar(id: string) {
    const motivo = prompt("Motivo da revogação (fica registrado na trilha de auditoria):");
    if (!motivo) return;
    rodar(id, () => revogarAssinatura(id, prestacaoId, motivo));
  }

  const pendentes = signatarios.filter((s) => s.nome && !s.assinatura);
  const semLink = pendentes.filter((s) => !conviteDe(s.papel));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm print:hidden">
      {/* Cabeçalho */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PenLine size={16} className="text-[#1e3a8a]" />
          <span className="text-sm font-semibold text-slate-800">Assinatura eletrônica</span>
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
            resumo.completo && resumo.integro
              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
              : resumo.divergentes > 0
              ? "bg-red-100 text-red-700 border-red-200"
              : "bg-amber-100 text-amber-800 border-amber-200"
          )}>
            {resumo.assinadas} de {resumo.total} assinaturas
          </span>
        </div>
        <div className="flex items-center gap-3">
          {semLink.length > 0 && (
            <button
              onClick={() => rodar("gerar-todos", () => gerarConvites(prestacaoId))}
              disabled={pending}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-medium flex items-center gap-1.5 disabled:opacity-40"
            >
              {ocupado === "gerar-todos" ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
              Gerar links de assinatura
            </button>
          )}
          <button
            onClick={() => copiar(urlVerificacao, "verif")}
            className="text-xs text-slate-600 hover:text-[#1e3a8a] flex items-center gap-1.5"
            title={urlVerificacao}
          >
            {copiado === "verif" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
            {copiado === "verif" ? "Copiado" : "Link de verificação"}
          </button>
        </div>
      </div>

      {erro && (
        <div className="mx-5 mt-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
          {erro}
        </div>
      )}

      {resumo.divergentes > 0 && (
        <div className="mx-5 mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-800 flex items-start gap-2">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          <div>
            <strong>Documento alterado após a assinatura.</strong> Houve mudança em lançamentos
            do período depois que {resumo.divergentes === 1 ? "esta assinatura foi coletada" : "estas assinaturas foram coletadas"}.
            Revogue as assinaturas divergentes e gere novos links.
          </div>
        </div>
      )}

      {/* Lista de signatários */}
      <ul className="divide-y divide-slate-100">
        {signatarios.map((s) => {
          const convite = conviteDe(s.papel);
          return (
            <li key={s.papel} className="px-5 py-3.5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-[220px]">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">{s.rotulo}</div>
                  <div className="text-sm font-medium text-slate-800">
                    {s.nome ?? <span className="text-slate-400 italic">não cadastrado</span>}
                    {s.cpf && (
                      <span className="ml-2 font-normal text-[11px] text-slate-500">
                        CPF {formatCPF(s.cpf)}
                      </span>
                    )}
                    {s.registro && (
                      <span className="ml-2 font-normal text-[11px] text-slate-500">{s.registro}</span>
                    )}
                  </div>

                  {s.assinatura ? (
                    <div className={cn(
                      "text-[11px] mt-1 flex items-center gap-1",
                      s.divergente ? "text-red-600" : "text-emerald-700"
                    )}>
                      {s.divergente ? <ShieldAlert size={11} /> : <ShieldCheck size={11} />}
                      Assinado em {formatDate(s.assinatura.assinado_em, "dd/MM/yyyy 'às' HH:mm")}
                      {s.assinatura.assinado_por_email
                        ? ` · pelo sistema (${s.assinatura.assinado_por_email})`
                        : " · pelo link de assinatura"}
                      {s.divergente && " · hash divergente"}
                    </div>
                  ) : convite ? (
                    <div className="text-[11px] mt-1 text-amber-700 flex items-center gap-1">
                      <Send size={11} />
                      Link gerado — aguardando assinatura · expira{" "}
                      {formatDate(convite.expira_em, "dd/MM/yyyy")}
                    </div>
                  ) : s.nome ? (
                    <div className="text-[11px] mt-1 text-slate-400">Sem link gerado</div>
                  ) : null}
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {s.assinatura ? (
                    <button
                      onClick={() => handleRevogar(s.assinatura!.id)}
                      disabled={pending}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-red-600 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {ocupado === s.assinatura.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                      Revogar
                    </button>
                  ) : convite ? (
                    <>
                      <button
                        onClick={() => copiar(convite.url, convite.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-medium flex items-center gap-1.5"
                      >
                        {copiado === convite.id ? <Check size={12} /> : <Copy size={12} />}
                        {copiado === convite.id ? "Copiado" : "Copiar link"}
                      </button>
                      <button
                        onClick={() => rodar(convite.id, () => cancelarConvite(convite.id, prestacaoId))}
                        disabled={pending}
                        className="text-xs p-1.5 rounded-lg border border-slate-300 text-slate-500 hover:text-red-600 hover:bg-slate-50 disabled:opacity-50"
                        title="Cancelar este link"
                      >
                        {ocupado === convite.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => rodar(s.papel, () => regerarConvite(prestacaoId, s.papel))}
                      disabled={pending || !s.nome}
                      className="text-xs px-3 py-1.5 rounded-lg border border-[#1e3a8a] text-[#1e3a8a] hover:bg-blue-50 font-medium flex items-center gap-1.5 disabled:opacity-40"
                      title={!s.nome ? "Cadastre o responsável em Convênio → Responsáveis" : undefined}
                    >
                      {ocupado === s.papel ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                      Gerar link
                    </button>
                  )}
                </div>
              </div>

              {/* Link visível para copiar à mão / mandar no WhatsApp */}
              {convite && !s.assinatura && (
                <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <code className="text-[10px] font-mono text-slate-600 break-all">{convite.url}</code>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Hash do documento */}
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
        <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
          Código de integridade do conteúdo (SHA-256)
        </div>
        <code className="text-[11px] font-mono text-slate-700 break-all">{hashLegivel(hashAtual)}</code>
        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
          Cada responsável recebe um link exclusivo, confirma o próprio CPF e assina sem
          precisar de login. Assinatura eletrônica avançada nos termos do art. 4º, II da
          Lei 14.063/2020. Se qualquer valor do período mudar, o código acima muda e os
          links pendentes deixam de valer.
        </p>
      </div>
    </div>
  );
}
