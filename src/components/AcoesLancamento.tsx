"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertTriangle, Ban, RotateCcw } from "lucide-react";
import type { StatusLancamento } from "@/lib/lancamentos";
import { conciliarLancamento, glosarLancamento, cancelarLancamento, reabrirLancamento } from "@/app/(app)/lancamentos/actions";
import { formatBRL } from "@/lib/utils";

interface Props {
  id: string;
  status: StatusLancamento;
  valor: number;
}

export default function AcoesLancamento({ id, status, valor }: Props) {
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState<null | "conciliar" | "glosar" | "cancelar">(null);
  const [erro, setErro] = useState<string | null>(null);

  function exec(fn: () => Promise<void>) {
    setErro(null);
    startTransition(async () => {
      try {
        await fn();
        setModal(null);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro desconhecido");
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {status !== "conciliado" && status !== "cancelado" && (
          <button
            onClick={() => setModal("conciliar")}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition flex items-center gap-1.5"
          >
            <CheckCircle2 size={14} /> Conciliar
          </button>
        )}
        {status !== "glosado" && status !== "cancelado" && (
          <button
            onClick={() => setModal("glosar")}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition flex items-center gap-1.5"
          >
            <AlertTriangle size={14} /> Glosar
          </button>
        )}
        {status !== "cancelado" && (
          <button
            onClick={() => setModal("cancelar")}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition flex items-center gap-1.5"
          >
            <Ban size={14} /> Cancelar
          </button>
        )}
        {(status === "conciliado" || status === "glosado" || status === "cancelado") && (
          <button
            onClick={() => exec(() => reabrirLancamento(id))}
            disabled={pending}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw size={14} /> Reabrir (Realizado)
          </button>
        )}
      </div>

      {/* Modal Conciliar */}
      {modal === "conciliar" && (
        <Modal titulo="Conciliar lançamento" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600 mb-4">
            Marca este lançamento como conciliado com o extrato bancário.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const data = fd.get("data") as string;
              exec(() => conciliarLancamento(id, data));
            }}
          >
            <label className="block text-xs font-medium text-slate-700 mb-1">Data de conciliação</label>
            <input
              name="data"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            {erro && <p className="text-xs text-red-600 mt-2">{erro}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setModal(null)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                Cancelar
              </button>
              <button type="submit" disabled={pending} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                {pending ? "Conciliando..." : "Conciliar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Glosar */}
      {modal === "glosar" && (
        <Modal titulo="Glosar lançamento" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600 mb-4">
            Marque o lançamento como glosado pelo órgão concedente. Informe motivo e valor glosado.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const motivo = String(fd.get("motivo") ?? "");
              const valorStr = String(fd.get("valor") ?? "0").replace(/\./g, "").replace(",", ".");
              const valorGlosa = Number(valorStr) || 0;
              exec(() => glosarLancamento(id, motivo, valorGlosa));
            }}
          >
            <label className="block text-xs font-medium text-slate-700 mb-1">Motivo da glosa</label>
            <textarea
              name="motivo"
              required
              rows={3}
              placeholder="Ex: Despesa sem comprovante fiscal anexado"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <label className="block text-xs font-medium text-slate-700 mt-3 mb-1">
              Valor glosado (R$) <span className="text-slate-500 font-normal">— total: {formatBRL(valor)}</span>
            </label>
            <input
              name="valor"
              type="text"
              inputMode="decimal"
              defaultValue={valor.toString().replace(".", ",")}
              required
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            {erro && <p className="text-xs text-red-600 mt-2">{erro}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setModal(null)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                Cancelar
              </button>
              <button type="submit" disabled={pending} className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                {pending ? "Glosando..." : "Confirmar glosa"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Cancelar */}
      {modal === "cancelar" && (
        <Modal titulo="Cancelar lançamento" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600 mb-4">
            O lançamento ficará marcado como <strong>cancelado</strong> e deixa de contar no saldo.
            Você poderá reabri-lo depois.
          </p>
          {erro && <p className="text-xs text-red-600 mb-2">{erro}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(null)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
              Voltar
            </button>
            <button
              type="button"
              onClick={() => exec(() => cancelarLancamento(id))}
              disabled={pending}
              className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {pending ? "Cancelando..." : "Confirmar cancelamento"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Modal({ titulo, children, onClose }: { titulo: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-slate-900 mb-3">{titulo}</h3>
        {children}
      </div>
    </div>
  );
}
