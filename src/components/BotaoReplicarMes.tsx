"use client";

import { useState } from "react";
import { Copy, X, Loader2 } from "lucide-react";
import { replicarMesAnterior } from "@/app/(app)/lancamentos/actions";

interface ConvenioOpcao { id: string; numero: string; }

export default function BotaoReplicarMes({ convenios }: { convenios: ConvenioOpcao[] }) {
  const [aberto, setAberto] = useState(false);
  const [convenioId, setConvenioId] = useState(convenios[0]?.id ?? "");
  const [mesDestino, setMesDestino] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  async function replicar() {
    if (!convenioId) {
      setErro("Selecione o convênio");
      return;
    }
    setSalvando(true);
    setErro(null);
    setSucesso(null);
    try {
      const r = await replicarMesAnterior({ convenio_id: convenioId, mes_destino: mesDestino });
      setSucesso(`✓ ${r.criados} lançamento(s) replicado(s)${r.pulados > 0 ? ` · ${r.pulados} pulado(s) (já existiam)` : ""}`);
      setTimeout(() => {
        setAberto(false);
        setSucesso(null);
      }, 2000);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao replicar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <button onClick={() => setAberto(true)}
        className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-1.5">
        <Copy size={14} /> Replicar mês anterior
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Replicar lançamentos do mês anterior</h2>
              <button onClick={() => setAberto(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Copia despesas recorrentes do mês anterior pro mês escolhido, com status &ldquo;previsto&rdquo;.
              <span className="block mt-1 text-amber-700">⚠️ Pula automaticamente: provisão, rescisão, férias e 13º.</span>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Convênio</label>
                <select value={convenioId} onChange={(e) => setConvenioId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm">
                  {convenios.map((c) => (
                    <option key={c.id} value={c.id}>{c.numero}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mês de destino</label>
                <input type="month"
                  value={mesDestino.slice(0, 7)}
                  onChange={(e) => setMesDestino(`${e.target.value}-01`)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                <p className="text-[10px] text-slate-400 mt-1">
                  Vai buscar despesas do mês anterior e copiar pra cá.
                </p>
              </div>
            </div>

            {erro && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">{erro}</div>
            )}
            {sucesso && (
              <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded text-xs">{sucesso}</div>
            )}

            <div className="mt-5 flex gap-2 justify-end">
              <button onClick={() => setAberto(false)}
                className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                Cancelar
              </button>
              <button onClick={replicar} disabled={salvando || !!sucesso}
                className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50">
                {salvando ? <Loader2 className="animate-spin" size={14} /> : <Copy size={14} />}
                Replicar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
