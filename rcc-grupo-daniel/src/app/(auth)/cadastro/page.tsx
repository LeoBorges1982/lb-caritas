"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function CadastroPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!accepted) {
      setError("É preciso aceitar os termos de uso e a política de privacidade.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setLoading(false);
    if (error) {
      setError(error.message.includes("already") ? "Este e-mail já está cadastrado." : error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <span className="text-4xl">🙏</span>
        <h2 className="text-lg font-semibold text-slate-800">Cadastro enviado!</h2>
        <p className="text-sm text-slate-600">
          Sua conta foi criada e aguarda aprovação da coordenação do grupo. Você receberá o acesso
          em breve.
        </p>
        <Link href="/login" className="block text-blue-700 font-medium hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Criar conta</h2>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">{error}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
          placeholder="Seu nome"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
          placeholder="seu@email.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
          placeholder="Mínimo 6 caracteres"
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <span>
          Li e aceito os <strong>termos de uso</strong> e a <strong>política de privacidade</strong>{" "}
          do RCC Grupo Daniel (LGPD).
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 text-base disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Criar conta"}
      </button>

      <p className="text-center text-sm">
        Já tem conta?{" "}
        <Link href="/login" className="text-blue-700 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
