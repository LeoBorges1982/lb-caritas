"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileSignature, Receipt, BookOpenCheck,
  Bell, Wallet, BarChart3, ExternalLink, FileText, HandHeart,
  Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITENS = [
  { href: "/dashboard", label: "Dashboard", icone: LayoutDashboard },
  { href: "/convenios", label: "Convênios", icone: FileSignature },
  { href: "/lancamentos", label: "Lançamentos", icone: Receipt },
  { href: "/balancetes", label: "Balancetes", icone: BookOpenCheck },
  { href: "/prestacoes", label: "Prestações", icone: FileText },
  { href: "/alertas", label: "Alertas", icone: Bell },
  { href: "/reembolsos", label: "Reembolsos", icone: Wallet },
  { href: "/relatorios", label: "Relatórios", icone: BarChart3 },
] as const;

/** Conteúdo interno do menu — compartilhado entre a sidebar fixa (desktop) e o drawer (mobile). */
function MenuConteudo({ path, aoNavegar }: { path: string; aoNavegar?: () => void }) {
  return (
    <>
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-amber-400 rounded-full blur-md opacity-40"></div>
            <div className="relative bg-gradient-to-br from-amber-300 to-amber-500 rounded-full p-2 shadow-lg ring-2 ring-white/20">
              <HandHeart size={20} className="text-[#1e3a8a]" strokeWidth={2.5} />
            </div>
          </div>
          <div className="leading-tight">
            <div className="font-bold text-base tracking-tight">LB Cáritas</div>
            <div className="text-[10px] text-blue-200/90">Convênios · Lei 13.019/14</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {ITENS.map((item) => {
          const ativo = path === item.href || path.startsWith(item.href + "/");
          const Icone = item.icone;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={aoNavegar}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition",
                ativo
                  ? "bg-white text-[#1e3a8a] font-medium shadow-sm"
                  : "text-blue-100 hover:bg-white/10"
              )}
            >
              <Icone size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-white/10">
        <a
          href="https://portal.leoborgescontador.com.br"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-blue-200 hover:bg-white/10 transition"
        >
          <ExternalLink size={12} />
          Portal LB
        </a>
        <div className="px-3 py-2 mt-1 text-[10px] text-blue-300 leading-relaxed">
          LB Assessoria Empresarial<br />
          CRC-RJ 091024/O
        </div>
      </div>
    </>
  );
}

export default function Sidebar() {
  const path = usePathname();
  const [aberto, setAberto] = useState(false);

  // Fecha o drawer ao navegar pra outra página
  useEffect(() => { setAberto(false); }, [path]);

  // Trava o scroll do body enquanto o drawer está aberto
  useEffect(() => {
    document.body.style.overflow = aberto ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [aberto]);

  return (
    <>
      {/* ===== Desktop (≥ lg) — sidebar fixa ===== */}
      <aside className="hidden lg:flex w-60 bg-gradient-to-b from-[#1e3a8a] to-[#1e40af] text-white flex-col fixed inset-y-0 left-0 z-30">
        <MenuConteudo path={path} />
      </aside>

      {/* ===== Mobile (< lg) — botão hamburger flutuante (FAB) ===== */}
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Abrir menu"
        className="lg:hidden fixed bottom-4 left-4 z-40 bg-[#1e3a8a] text-white rounded-full p-3.5 shadow-lg active:scale-95 transition"
      >
        <Menu size={22} />
      </button>

      {/* Backdrop */}
      {aberto && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
          onClick={() => setAberto(false)}
        />
      )}

      {/* Drawer deslizante */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-gradient-to-b from-[#1e3a8a] to-[#1e40af] text-white flex flex-col",
          "transition-transform duration-200 ease-out",
          aberto ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
          onClick={() => setAberto(false)}
          aria-label="Fechar menu"
          className="absolute top-4 right-3 text-blue-100 hover:text-white p-1"
        >
          <X size={20} />
        </button>
        <MenuConteudo path={path} aoNavegar={() => setAberto(false)} />
      </aside>
    </>
  );
}
