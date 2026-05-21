"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { atualizarPapel, removerAcesso } from "@/app/(app)/convenios/[id]/acessos/actions";
import { PAPEL_LABEL, PAPEL_CORES, type PapelAcesso } from "@/lib/acessos";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  convenioId: string;
  nome: string | null;
  email: string | null;
  papel: PapelAcesso;
}

export default function AcessoLinha({ id, convenioId, nome, email, papel }: Props) {
  const [pending, startTransition] = useTransition();
  const [papelAtual, setPapelAtual] = useState<PapelAcesso>(papel);

  function handlePapel(novo: PapelAcesso) {
    setPapelAtual(novo);
    startTransition(async () => {
      try {
        await atualizarPapel(id, novo, convenioId);
      } catch (e) {
        setPapelAtual(papel);
        alert(e instanceof Error ? e.message : "Erro");
      }
    });
  }

  function handleRemove() {
    if (!confirm(`Remover acesso de "${nome ?? email}"?`)) return;
    startTransition(async () => {
      try {
        await removerAcesso(id, convenioId);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Erro");
      }
    });
  }

  const inicial = (nome || email || "?").charAt(0).toUpperCase();

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1e3a8a] text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
            {inicial}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-800 truncate">{nome ?? "(sem nome)"}</div>
            <div className="text-xs text-slate-500 truncate">{email ?? "(sem email)"}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border", PAPEL_CORES[papelAtual])}>
            {PAPEL_LABEL[papelAtual]}
          </span>
          <select
            value={papelAtual}
            onChange={(e) => handlePapel(e.target.value as PapelAcesso)}
            disabled={pending}
            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white disabled:opacity-50"
          >
            <option value="visualizador">Visualizador</option>
            <option value="operador">Operador</option>
            <option value="gestor">Gestor</option>
          </select>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={handleRemove}
          disabled={pending}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
          title="Remover acesso"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </td>
    </tr>
  );
}
