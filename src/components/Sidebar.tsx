"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileSignature, Receipt, BookOpenCheck,
  Bell, Wallet, BarChart3, ExternalLink, FileText,
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

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="hidden lg:flex w-60 bg-[#1e3a8a] text-white flex-col fixed inset-y-0 left-0 z-30">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-md p-1.5">
            <img src="/logo-lb.png" alt="LB" className="h-7 w-auto" />
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight">LB Caritas</div>
            <div className="text-[10px] text-blue-200 leading-tight">Convênios Públicos · Lei 13.019/14</div>
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
    </aside>
  );
}
