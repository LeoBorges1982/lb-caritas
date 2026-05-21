"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { TIPO_LABEL, STATUS_LABEL, type TipoLancamento, type StatusLancamento } from "@/lib/lancamentos";

const TIPOS: TipoLancamento[] = ["despesa", "repasse", "rendimento", "devolucao", "estorno"];
const STATUS: StatusLancamento[] = ["previsto", "realizado", "conciliado", "glosado", "cancelado"];

interface Props {
  convenios: { id: string; numero: string }[];
}

export default function FiltrosLancamentos({ convenios }: Props) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();

  function atualizar(chave: string, valor: string) {
    const novos = new URLSearchParams(params.toString());
    if (valor) novos.set(chave, valor);
    else novos.delete(chave);
    router.push(`${path}?${novos.toString()}`);
  }

  function limpar() {
    router.push(path);
  }

  const temFiltro =
    !!params.get("convenio_id") || !!params.get("tipo") ||
    !!params.get("status") || !!params.get("mes") || !!params.get("busca");

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-5">
        <select
          value={params.get("convenio_id") ?? ""}
          onChange={(e) => atualizar("convenio_id", e.target.value)}
          className={inputCn}
        >
          <option value="">Todos os convênios</option>
          {convenios.map((c) => (
            <option key={c.id} value={c.id}>{c.numero}</option>
          ))}
        </select>

        <select
          value={params.get("tipo") ?? ""}
          onChange={(e) => atualizar("tipo", e.target.value)}
          className={inputCn}
        >
          <option value="">Todos os tipos</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>{TIPO_LABEL[t]}</option>
          ))}
        </select>

        <select
          value={params.get("status") ?? ""}
          onChange={(e) => atualizar("status", e.target.value)}
          className={inputCn}
        >
          <option value="">Todos os status</option>
          {STATUS.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>

        <input
          type="month"
          value={params.get("mes") ?? ""}
          onChange={(e) => atualizar("mes", e.target.value)}
          className={inputCn}
        />

        <input
          type="search"
          placeholder="Buscar por descrição ou fornecedor..."
          defaultValue={params.get("busca") ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") atualizar("busca", e.currentTarget.value);
          }}
          className={inputCn}
        />
      </div>

      {temFiltro && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={limpar}
            className="text-xs text-slate-500 hover:text-[#1e3a8a] transition"
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}

const inputCn =
  "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]/60";
