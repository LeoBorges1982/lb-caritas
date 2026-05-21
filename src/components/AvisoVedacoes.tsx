"use client";

import { useState, useMemo } from "react";
import { ShieldAlert, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import type { Vedacao } from "@/lib/vedacoes";
import { cn } from "@/lib/utils";

interface Props {
  vedacoes: Vedacao[];
  /** Texto livre que será verificado por palavras-chave (descricao + fornecedor) */
  contextoTextual?: string;
}

// Heurísticas simples: dispara warning quando contexto contém palavras-chave
const REGRAS_KEYWORDS: { palavras: RegExp; matchVedacao: RegExp }[] = [
  { palavras: /tarifa|tarifas|tarifa banc/i, matchVedacao: /tarifa banc/i },
  { palavras: /multa|juros|mora|corre[çc]/i, matchVedacao: /multa|juros|corre[çc]/i },
  { palavras: /publicidade|propaganda|outdoor/i, matchVedacao: /publicidade/i },
  { palavras: /partido|sindicato|associa[çc]/i, matchVedacao: /clubes|partidos|associa/i },
  { palavras: /obra|reforma estrutural|constru[çc]/i, matchVedacao: /obras/i },
  { palavras: /agente p[uú]blico|servidor|funcion[áa]rio municipal/i, matchVedacao: /agentes p[uú]blicos/i },
];

export default function AvisoVedacoes({ vedacoes, contextoTextual }: Props) {
  const [aberto, setAberto] = useState(false);

  const matches = useMemo(() => {
    if (!contextoTextual || !contextoTextual.trim()) return [];
    const m: Vedacao[] = [];
    for (const regra of REGRAS_KEYWORDS) {
      if (!regra.palavras.test(contextoTextual)) continue;
      const found = vedacoes.find((v) => regra.matchVedacao.test(v.descricao));
      if (found && !m.includes(found)) m.push(found);
    }
    return m;
  }, [contextoTextual, vedacoes]);

  if (vedacoes.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className={cn(
          "w-full px-5 py-3 flex items-center justify-between text-left transition",
          matches.length > 0 ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-slate-50"
        )}
      >
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className={matches.length > 0 ? "text-amber-700" : "text-slate-500"} />
          <span className="text-sm font-semibold text-slate-800">
            Vedações da Lei 13.019/2014 · {vedacoes.length} itens
          </span>
          {matches.length > 0 && (
            <span className="bg-amber-200 text-amber-900 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
              {matches.length} possível {matches.length > 1 ? "conflito" : "conflito"}
            </span>
          )}
        </div>
        {aberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {matches.length > 0 && (
        <div className="px-5 py-3 bg-amber-50 border-t border-amber-200">
          <div className="flex items-start gap-2 text-xs text-amber-900">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <div>
              <strong>Atenção:</strong> a descrição/fornecedor casa com palavras-chave de{" "}
              {matches.length} {matches.length > 1 ? "vedações" : "vedação"} abaixo. Revise antes de salvar.
            </div>
          </div>
        </div>
      )}

      {aberto && (
        <ul className="px-5 py-3 space-y-2">
          {vedacoes.map((v, i) => {
            const flagged = matches.includes(v);
            return (
              <li
                key={v.id}
                className={cn(
                  "text-xs flex items-start gap-2 p-2 rounded",
                  flagged && "bg-amber-100 border border-amber-200"
                )}
              >
                <span className={cn(
                  "font-mono font-bold w-5 text-center shrink-0",
                  flagged ? "text-amber-800" : "text-slate-400"
                )}>
                  {i + 1}
                </span>
                <div className="flex-1">
                  <span className={flagged ? "text-amber-900 font-medium" : "text-slate-700"}>
                    {v.descricao}
                  </span>
                  {v.base_legal && (
                    <span className="text-slate-500 ml-1">— {v.base_legal}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
