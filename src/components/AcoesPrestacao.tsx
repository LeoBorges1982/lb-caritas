"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle, XCircle, Send, Trash2, RotateCcw, Loader2 } from "lucide-react";
import { atualizarStatusPrestacao, deletarPrestacao } from "@/app/(app)/prestacoes/actions";
import type { StatusPrestacao } from "@/lib/prestacoes";

interface Props {
  id: string;
  status: StatusPrestacao;
}

export default function AcoesPrestacao({ id, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState<null | "protocolar" | "aprovar" | "aprovar_ressalvas" | "rejeitar">(null);
  const [erro, setErro] = useState<string | null>(null);

  function exec(fn: () => Promise<void>) {
    setErro(null);
    startTransition(async () => {
      try {
        await fn();
        setModal(null);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro");
      }
    });
  }

  function handleExcluir() {
    if (!confirm("Excluir esta prestação? Só funciona se estiver em rascunho.")) return;
    exec(async () => {
      await deletarPrestacao(id);
      router.push("/prestacoes");
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {status === "rascunho" && (
          <>
            <button
              onClick={() => setModal("protocolar")}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5"
            >
              <Send size={14} /> Protocolar
            </button>
            <button
              onClick={handleExcluir}
              disabled={pending}
              className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 text-sm font-medium rounded-lg flex items-center gap-1.5"
            >
              <Trash2 size={14} /> Excluir
            </button>
          </>
        )}
        {status === "protocolada" && (
          <button
            onClick={() => exec(() => atualizarStatusPrestacao(id, "em_analise"))}
            disabled={pending}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 disabled:opacity-50"
          >
            <AlertTriangle size={14} /> Marcar &ldquo;em análise&rdquo;
          </button>
        )}
        {(status === "protocolada" || status === "em_analise") && (
          <>
            <button
              onClick={() => setModal("aprovar")}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} /> Aprovar
            </button>
            <button
              onClick={() => setModal("aprovar_ressalvas")}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} /> Aprovar c/ ressalvas
            </button>
            <button
              onClick={() => setModal("rejeitar")}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5"
            >
              <XCircle size={14} /> Rejeitar
            </button>
          </>
        )}
        {(status === "aprovada" || status === "aprovada_ressalvas" || status === "rejeitada") && (
          <button
            onClick={() => exec(() => atualizarStatusPrestacao(id, "em_analise"))}
            disabled={pending}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg flex items-center gap-1.5"
          >
            <RotateCcw size={14} /> Voltar para análise
          </button>
        )}
      </div>

      {modal === "protocolar" && (
        <Modal titulo="Protocolar prestação" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600 mb-3">
            Marca a prestação como protocolada na SEMAS. Informe o número do protocolo se já tiver.
          </p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const protocolo = String(fd.get("protocolo") ?? "");
            exec(() => atualizarStatusPrestacao(id, "protocolada", { protocolo }));
          }}>
            <label className="block text-xs font-medium text-slate-700 mb-1">Número do protocolo (opcional)</label>
            <input name="protocolo" type="text" placeholder="Ex: SEMAS/2025/12345" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            {erro && <p className="text-xs text-red-600 mt-2">{erro}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setModal(null)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button type="submit" disabled={pending} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                {pending ? "Protocolando..." : "Confirmar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {(modal === "aprovar" || modal === "aprovar_ressalvas" || modal === "rejeitar") && (
        <Modal
          titulo={
            modal === "aprovar" ? "Aprovar prestação" :
            modal === "aprovar_ressalvas" ? "Aprovar com ressalvas" :
            "Rejeitar prestação"
          }
          onClose={() => setModal(null)}
        >
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const parecer_tecnico = String(fd.get("parecer") ?? "");
            const glosaStr = String(fd.get("glosa") ?? "0").replace(/\./g, "").replace(",", ".");
            const glosa_total = Number(glosaStr) || 0;
            const novoStatus: StatusPrestacao =
              modal === "aprovar" ? "aprovada" :
              modal === "aprovar_ressalvas" ? "aprovada_ressalvas" :
              "rejeitada";
            exec(() => atualizarStatusPrestacao(id, novoStatus, { parecer_tecnico, glosa_total }));
          }}>
            <label className="block text-xs font-medium text-slate-700 mb-1">Parecer técnico</label>
            <textarea name="parecer" rows={4} required className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Resumo do parecer da SEMAS..." />
            {modal !== "aprovar" && (
              <>
                <label className="block text-xs font-medium text-slate-700 mt-3 mb-1">
                  Glosa total (R$) — {modal === "rejeitar" ? "valor questionado" : "valor não aceito"}
                </label>
                <input name="glosa" type="text" inputMode="decimal" defaultValue="0,00" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </>
            )}
            {erro && <p className="text-xs text-red-600 mt-2">{erro}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setModal(null)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button
                type="submit"
                disabled={pending}
                className={`px-4 py-1.5 text-white text-sm font-medium rounded-lg disabled:opacity-50 ${
                  modal === "aprovar" ? "bg-emerald-600 hover:bg-emerald-700" :
                  modal === "aprovar_ressalvas" ? "bg-teal-600 hover:bg-teal-700" :
                  "bg-red-600 hover:bg-red-700"
                }`}
              >
                {pending ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-slate-900 mb-3">{titulo}</h3>
        {children}
      </div>
    </div>
  );
}
