"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { initials, ROLES } from "@/lib/utils";
import type { Role } from "@/lib/session";

export default function Header({ name, role }: { name: string; role: Role }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur px-4 py-3 lg:px-6">
      <div className="flex items-center gap-2 lg:hidden">
        <span className="text-xl">🕊️</span>
        <span className="font-bold text-slate-800">Grupo Daniel</span>
      </div>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-3">
        <Link href="/perfil" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-blue-700 text-white flex items-center justify-center text-sm font-semibold">
            {initials(name)}
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-slate-800 leading-tight">{name}</p>
            <p className="text-xs text-slate-500">{ROLES[role]}</p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          title="Sair"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
