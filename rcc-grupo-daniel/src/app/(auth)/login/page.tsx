"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("E-mail ou senha inválidos. Tente novamente.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Entrar</h2>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">{error}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
          placeholder="seu@email.com"
          autoComplete="email"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 text-base disabled:opacity-60"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>

      <div className="flex items-center justify-between text-sm pt-1">
        <Link href="/recuperar-senha" className="text-blue-700 hover:underline">
          Esqueci minha senha
        </Link>
        <Link href="/cadastro" className="text-blue-700 hover:underline">
          Criar conta
        </Link>
      </div>
    </form>
  );
}
