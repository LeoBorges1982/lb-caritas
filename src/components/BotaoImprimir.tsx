"use client";

import { Printer } from "lucide-react";

export default function BotaoImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1.5"
    >
      <Printer size={14} /> Imprimir / Salvar PDF
    </button>
  );
}
