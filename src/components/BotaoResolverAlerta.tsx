"use client";

import { useTransition } from "react";
import { CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { resolverAlerta, reabrirAlerta } from "@/app/(app)/alertas/actions";

export default function BotaoResolverAlerta({ id, resolvido }: { id: string; resolvido: boolean }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        if (resolvido) await reabrirAlerta(id);
        else await resolverAlerta(id);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Erro");
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="text-xs bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
    >
      {pending ? <Loader2 size={12} className="animate-spin" /> : resolvido ? <RotateCcw size={12} /> : <CheckCircle2 size={12} />}
      {resolvido ? "Reabrir" : "Marcar como resolvido"}
    </button>
  );
}
