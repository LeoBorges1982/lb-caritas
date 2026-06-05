"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deletarPrestacao } from "@/app/(app)/prestacoes/actions";

export default function BotaoExcluirPrestacao({ id, label }: { id: string; label?: string }) {
  const [excluindo, setExcluindo] = useState(false);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const msg = label ? `Excluir prestação ${label}?` : "Excluir essa prestação?";
    if (!confirm(msg + "\n\nEssa ação não pode ser desfeita.")) return;
    setExcluindo(true);
    try {
      await deletarPrestacao(id);
    } catch (err) {
      alert("Erro: " + (err instanceof Error ? err.message : "desconhecido"));
      setExcluindo(false);
    }
  }

  return (
    <button onClick={onClick} disabled={excluindo}
      className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-slate-100 disabled:opacity-50"
      title="Excluir prestação">
      {excluindo ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
    </button>
  );
}
