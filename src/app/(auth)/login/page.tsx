import Link from "next/link";
import { ESCRITORIO } from "@/lib/constants";

export default function Login() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <h1 className="text-2xl font-bold text-[#1e3a8a] mb-2">LB Caritas</h1>
        <p className="text-sm text-slate-600 mb-6">
          Gestão de Convênios Públicos · Acesso pelo Portal LB (login único)
        </p>
        <Link
          href={ESCRITORIO.portalUrl}
          className="inline-block bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-medium px-5 py-2.5 rounded-lg transition"
        >
          Entrar pelo Portal →
        </Link>
        <p className="text-xs text-slate-500 mt-6">
          Lei Federal 13.019/2014 · Marco Regulatório das OSCs
        </p>
      </div>
    </main>
  );
}
