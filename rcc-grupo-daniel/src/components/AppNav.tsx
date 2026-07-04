"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Wallet,
  QrCode,
  CalendarDays,
  Megaphone,
  HeartHandshake,
  ClipboardCheck,
  UserCog,
  Settings,
  UserCircle,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/session";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
};

const ALL: Role[] = ["admin", "tesoureiro", "lider", "membro"];

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: Home, roles: ALL },
  { href: "/membros", label: "Membros", icon: Users, roles: ["admin", "tesoureiro", "lider"] },
  { href: "/financeiro", label: "Financeiro", icon: Wallet, roles: ["admin", "tesoureiro"] },
  { href: "/pix", label: "PIX", icon: QrCode, roles: ALL },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3, roles: ["admin", "tesoureiro"] },
  { href: "/frequencia", label: "Frequência", icon: ClipboardCheck, roles: ["admin", "lider"] },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, roles: ALL },
  { href: "/avisos", label: "Mural", icon: Megaphone, roles: ALL },
  { href: "/oracao", label: "Oração", icon: HeartHandshake, roles: ALL },
  { href: "/usuarios", label: "Usuários", icon: UserCog, roles: ["admin"] },
  { href: "/configuracoes", label: "Configurações", icon: Settings, roles: ["admin"] },
  { href: "/perfil", label: "Perfil", icon: UserCircle, roles: ALL },
];

// Itens da barra inferior (mobile) por perfil — máx. 5
function bottomItems(role: Role): NavItem[] {
  const prefer: Record<Role, string[]> = {
    admin: ["/dashboard", "/membros", "/financeiro", "/agenda", "/avisos"],
    tesoureiro: ["/dashboard", "/financeiro", "/pix", "/relatorios", "/avisos"],
    lider: ["/dashboard", "/membros", "/frequencia", "/agenda", "/avisos"],
    membro: ["/dashboard", "/agenda", "/pix", "/avisos", "/perfil"],
  };
  return prefer[role]
    .map((h) => NAV_ITEMS.find((i) => i.href === h)!)
    .filter(Boolean);
}

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = bottomItems(role);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white pb-safe lg:hidden">
      <div className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                active ? "text-blue-700" : "text-slate-500"
              )}
            >
              <Icon className={cn("h-6 w-6", active ? "text-blue-700" : "text-slate-400")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => i.roles.includes(role));

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div className="h-10 w-10 rounded-xl bg-blue-700 flex items-center justify-center text-xl">
          🕊️
        </div>
        <div>
          <p className="font-bold text-slate-800 leading-tight">RCC Grupo Daniel</p>
          <p className="text-xs text-slate-500">Gestão do grupo</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                active
                  ? "bg-blue-50 text-blue-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
