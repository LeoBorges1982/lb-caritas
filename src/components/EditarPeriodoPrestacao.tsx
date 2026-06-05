"use client";

import { useState, useTransition } from "react";
import { Pencil, X, Check } from "lucide-react";
import { atualizarPeriodoPrestacao } from "@/app/(app)/prestacoes/actions";

interface Props {
  id: string;
  periodoInicio: string;
  periodoFim: string;
}

export default function EditarPeriodoPrestacao({ id, periodoInicio, periodoFim }: Props) {
  const [editando, setEditando] = useState(false);
  const [inicio, setInicio] = useState(periodoInicio.slice(0, 10));
  const [fim, setFim] = useState(periodoFim.slice(0, 10));
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function salvar() {
    setErro(null);
    const fd = new FormData();
    fd.set("periodo_inicio", inicio);
    fd.set("periodo_fim", fim);
    startTransition(async () => {
      try {
        await atualizarPeriodoPrestacao(id, fd);
        setEditando(false);
      } catch (e) {
        setErro(e instanceof Error ? e.message : String(e));
      }
    });
  }

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="text-[10px] text-slate-500 hover:text-[#1e3a8a] inline-flex items-center gap-1 ml-2 print:hidden"
        title="Editar período"
      >
        <Pencil size={11} /> editar
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 ml-2 print:hidden">
      <input
        type="date"
        value={inicio}
        onChange={(e) => setInicio(e.target.value)}
        className="border border-slate-300 rounded px-2 py-0.5 text-xs"
      />
      <span className="text-xs">à</span>
      <input
        type="date"
        value={fim}
        onChange={(e) => setFim(e.target.value)}
        className="border border-slate-300 rounded px-2 py-0.5 text-xs"
      />
      <button
        type="button"
        onClick={salvar}
        disabled={pending}
        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded p-1 disabled:opacity-50"
        title="Salvar"
      >
        <Check size={12} />
      </button>
      <button
        type="button"
        onClick={() => { setEditando(false); setErro(null); }}
        className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded p-1"
        title="Cancelar"
      >
        <X size={12} />
      </button>
      {erro && <span className="text-[10px] text-red-600 ml-1">{erro}</span>}
    </div>
  );
}
