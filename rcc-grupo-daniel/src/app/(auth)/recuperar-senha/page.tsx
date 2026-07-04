"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <span className="text-4xl">📬</span>
        <h2 className="text-lg font-semibold text-slate-800">Verifique seu e-mail</h2>
        <p className="text-sm text-slate-600">
          Se o e-mail estiver cadastrado, enviamos um link para redefinir sua senha.
        </p>
        <Link href="/login" className="block text-blue-700 font-medium hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Recuperar senha</h2>
      <p className="text-sm text-slate-600">
        Informe seu e-mail e enviaremos um link para você criar uma nova senha.
      </p>

      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
        placeholder="seu@email.com"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 text-base disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Enviar link"}
      </button>

      <p className="text-center text-sm">
        <Link href="/login" className="text-blue-700 hover:underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
