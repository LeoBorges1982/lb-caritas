"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

interface Props {
  email: string;
  nome?: string;
}

export default function Header({ email, nome }: Props) {
  const router = useRouter();

  async function sair() {
    document.cookie = "lb_caritas_session=; Max-Age=0; path=/; domain=.leoborgescontador.com.br";
    router.push("/login");
    router.refresh();
  }

  const inicial = (nome || email).charAt(0).toUpperCase();

  return (
    <header className="bg-white border-b border-slate-200 h-14 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="text-sm text-slate-500">
        Bem-vindo, <strong className="text-slate-800">{nome || email.split("@")[0]}</strong>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
          <div className="w-7 h-7 bg-[#1e3a8a] text-white rounded-full flex items-center justify-center text-xs font-bold">
            {inicial}
          </div>
          <div className="text-xs">
            <div className="font-medium text-slate-800 leading-tight">{nome || email.split("@")[0]}</div>
            <div className="text-slate-500 leading-tight">{email}</div>
          </div>
        </div>
        <button
          onClick={sair}
          title="Sair"
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-red-600 transition"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
