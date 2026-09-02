"use client";

import { useState, useTransition } from "react";
import { PenLine, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { assinarPorConvite } from "./actions";

interface Props {
  token: string;
  nome: string;
  papelLabel: string;
}

export default function AssinarForm({ token, nome, papelLabel }: Props) {
  const [cpf, setCpf] = useState("");
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [restantes, setRestantes] = useState<number | null>(null);
  const [assinado, setAssinado] = useState(false);
  const [pending, startTransition] = useTransition();

  function mascarar(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 11);
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
  }

  function enviar() {
    setErro(null);
    startTransition(async () => {
      const r = await assinarPorConvite(token, cpf, aceite);
      if (r.ok) {
        setAssinado(true);
      } else {
        setErro(r.erro ?? "Não foi possível assinar.");
        setRestantes(r.tentativasRestantes ?? null);
      }
    });
  }

  if (assinado) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
        <ShieldCheck size={40} className="text-emerald-600 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-emerald-900">Assinatura registrada</h2>
        <p className="text-sm text-emerald-800 mt-2 leading-relaxed">
          Obrigado, {nome.split(" ")[0]}. Sua assinatura como{" "}
          <strong>{papelLabel}</strong> foi registrada com data, hora e código de
          integridade do documento.
        </p>
        <p className="text-xs text-emerald-700 mt-3">
          Você já pode fechar esta página. Não é preciso fazer mais nada.
        </p>
      </div>
    );
  }

  const cpfCompleto = cpf.replace(/\D/g, "").length === 11;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800 mb-1">
        Confirme sua identidade para assinar
      </h2>
      <p className="text-sm text-slate-600 mb-5">
        Você está assinando como <strong>{papelLabel}</strong>.
      </p>

      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        Seu CPF
      </label>
      <input
        type="text"
        inputMode="numeric"
        value={cpf}
        onChange={(e) => setCpf(mascarar(e.target.value))}
        placeholder="000.000.000-00"
        autoComplete="off"
        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base tracking-wide focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]"
      />

      <label className="flex items-start gap-2.5 mt-5 cursor-pointer">
        <input
          type="checkbox"
          checked={aceite}
          onChange={(e) => setAceite(e.target.checked)}
          className="mt-0.5 w-4 h-4 shrink-0 accent-[#1e3a8a]"
        />
        <span className="text-sm text-slate-700 leading-relaxed">
          Declaro que li a prestação de contas acima, que as informações
          correspondem à realidade e que esta assinatura eletrônica tem a mesma
          validade da minha assinatura de próprio punho.
        </span>
      </label>

      {erro && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-800 rounded-lg px-3 py-2.5 text-sm flex items-start gap-2">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <div>
            {erro}
            {restantes !== null && restantes > 0 && (
              <div className="text-xs mt-1 text-red-700">
                {restantes === 1
                  ? "Resta 1 tentativa."
                  : `Restam ${restantes} tentativas.`}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={enviar}
        disabled={pending || !cpfCompleto || !aceite}
        className="mt-5 w-full bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-3 flex items-center justify-center gap-2 transition"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <PenLine size={16} />}
        Assinar documento
      </button>

      <p className="text-[11px] text-slate-500 mt-3 text-center leading-relaxed">
        Ao assinar são registrados data, hora, seu endereço de rede e o código
        de integridade do documento.
      </p>
    </div>
  );
}
