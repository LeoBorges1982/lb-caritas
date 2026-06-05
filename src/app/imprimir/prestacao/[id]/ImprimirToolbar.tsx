"use client";

import { useEffect } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ImprimirToolbar({ nomeArquivo }: { nomeArquivo: string }) {
  // Renomeia o título da aba pra ser o nome do arquivo PDF
  useEffect(() => {
    document.title = nomeArquivo;
  }, [nomeArquivo]);

  return (
    <div className="no-print fixed top-0 left-0 right-0 z-50 bg-slate-900 text-white px-6 py-3 flex items-center gap-3 shadow-lg">
      <Link href={"/prestacoes"} className="hover:text-slate-300 flex items-center gap-1 text-sm">
        <ArrowLeft size={16} /> Voltar
      </Link>
      <div className="flex-1 text-sm text-slate-300">Relatório oficial — pronto pra impressão / PDF</div>
      <div className="text-xs text-amber-300 hidden md:block">
        📌 Na janela de impressão: marque <b>&ldquo;Gráficos em segundo plano&rdquo;</b> e desmarque <b>&ldquo;Cabeçalhos e rodapés&rdquo;</b>
      </div>
      <button
        onClick={() => window.print()}
        className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
      >
        <Printer size={14} /> Imprimir / Salvar PDF
      </button>
    </div>
  );
}
