"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, Wallet, Trash2, Loader2 } from "lucide-react";
import { aprovarReembolso, rejeitarReembolso, pagarReembolso, deletarReembolso } from "@/app/(app)/reembolsos/actions";
import type { StatusReembolso } from "@/lib/reembolsos";
import { formatBRL } from "@/lib/utils";

interface Props {
  id: string;
  status: StatusReembolso;
  valor: number;
}

export default function AcoesReembolso({ id, status, valor }: Props) {
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState<null | "aprovar" | "rejeitar" | "pagar">(null);
  const [erro, setErro] = useState<string | null>(null);

  function exec(fn: () => Promise<void>) {
    setErro(null);
    startTransition(async () => {
      try { await fn(); setModal(null); }
      catch (e) { setErro(e instanceof Error ? e.message : "Erro"); }
    });
  }

  function handleExcluir() {
    if (!confirm("Excluir esta solicitação? Não pode desfazer.")) return;
    exec(() => deletarReembolso(id));
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {status === "solicitado" && (
          <>
            <button onClick={() => exec(() => aprovarReembolso(id))} disabled={pending} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 disabled:opacity-50">
              <CheckCircle2 size={14} /> Aprovar
            </button>
            <button onClick={() => setModal("rejeitar")} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5">
              <XCircle size={14} /> Rejeitar
            </button>
          </>
        )}
        {status === "aprovado" && (
          <button onClick={() => setModal("pagar")} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5">
            <Wallet size={14} /> Registrar pagamento
          </button>
        )}
        {(status === "solicitado" || status === "rejeitado") && (
          <button onClick={handleExcluir} disabled={pending} className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 text-sm font-medium rounded-lg flex items-center gap-1.5">
            <Trash2 size={14} /> Excluir
          </button>
        )}
      </div>

      {modal === "rejeitar" && (
        <Modal titulo="Rejeitar reembolso" onClose={() => setModal(null)}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const motivo = String(fd.get("motivo") ?? "");
            exec(() => rejeitarReembolso(id, motivo));
          }}>
            <label className="block text-xs font-medium text-slate-700 mb-1">Motivo da rejeição</label>
            <textarea name="motivo" required rows={3} placeholder="Ex: Despesa não vinculada ao objeto do convênio." className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            {erro && <p className="text-xs text-red-600 mt-2">{erro}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setModal(null)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button type="submit" disabled={pending} className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                {pending ? "Rejeitando..." : "Confirmar rejeição"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "pagar" && (
        <Modal titulo="Registrar pagamento" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600 mb-3">
            Vai gerar um lançamento de despesa de <strong>{formatBRL(valor)}</strong> no convênio e marcar o reembolso como pago.
          </p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const data = String(fd.get("data") ?? "");
            const forma = String(fd.get("forma") ?? "pix");
            const conta = String(fd.get("conta") ?? "corrente") as "corrente" | "aplicacao";
            exec(() => pagarReembolso(id, data, forma, conta));
          }}>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-700 block mb-1">Data do pagamento</span>
                <input name="data" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-700 block mb-1">Forma de pagamento</span>
                <select name="forma" required defaultValue="pix" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="pix">PIX</option>
                  <option value="ted">TED</option>
                  <option value="doc">DOC</option>
                  <option value="cheque">Cheque</option>
                  <option value="debito">Débito</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-700 block mb-1">Conta origem</span>
                <select name="conta" required defaultValue="corrente" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="corrente">Conta corrente</option>
                  <option value="aplicacao">Conta aplicação</option>
                </select>
              </label>
            </div>
            {erro && <p className="text-xs text-red-600 mt-2">{erro}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setModal(null)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button type="submit" disabled={pending} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                {pending ? "Registrando..." : "Confirmar pagamento"}
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
