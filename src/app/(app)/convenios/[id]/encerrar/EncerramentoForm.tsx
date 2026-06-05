"use client";

import { useState } from "react";
import { registrarOficio, registrarDevolucao, criarProrrogacao, finalizarSemRenovacao } from "./actions";
import type { CalculoEncerramento, Encerramento } from "@/lib/encerramentos";
import { Loader2, Save, ArrowRight, XCircle } from "lucide-react";

export default function EncerramentoForm({
  convenioId, calculo, encerramento,
}: {
  convenioId: string;
  calculo: CalculoEncerramento;
  encerramento: Encerramento | null;
}) {
  const [savando, setSalvando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function handle(action: string, fn: () => Promise<void>) {
    setSalvando(action);
    setErro(null);
    try {
      await fn();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <div className="space-y-4">
      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-lg text-sm">{erro}</div>
      )}

      {/* PARTE 1: REGISTRAR OFÍCIO */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <span className="bg-[#1e3a8a] text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-xs">1</span>
          Registrar Ofício do Órgão
        </h2>
        <p className="text-xs text-slate-500 mb-4">Informe os valores decididos pela SEMAS/FMAS no ofício recebido.</p>

        <form action={(fd) => handle("oficio", () => registrarOficio(convenioId, fd))} className="space-y-3">
          {/* Valores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Valor a manter (provisão)" name="valor_a_manter"
              defaultValue={encerramento?.valor_a_manter ?? 0}
              hint="Ex: encargos trabalhistas futuros" />
            <Field label="Valor a devolver ao órgão" name="valor_a_devolver"
              defaultValue={encerramento?.valor_a_devolver ?? 0}
              hint="Saldo não autorizado a manter" />
            <Field label="Glosado" name="valor_glosado"
              defaultValue={encerramento?.valor_glosado ?? 0}
              hint="Não aceito na prestação" />
          </div>

          {/* Verificação */}
          <SomaVerificacao calculo={calculo} />

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Finalidade do saldo mantido</label>
            <input name="finalidade_saldo" type="text" defaultValue={encerramento?.finalidade_saldo ?? ""}
              placeholder="Ex: Encargos trabalhistas e patronais futuros"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Rubricas autorizadas para uso do saldo</label>
            <input name="rubricas_permitidas" type="text"
              defaultValue={encerramento?.rubricas_permitidas?.join(", ") ?? ""}
              placeholder="Ex: Encargos Patronais, Provisionamento"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
            <p className="text-[10px] text-slate-400 mt-1">Códigos ou nomes separados por vírgula. Sistema bloqueia uso em outras rubricas.</p>
          </div>

          {/* Dados do ofício */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nº do ofício</label>
              <input name="oficio_numero" type="text" defaultValue={encerramento?.oficio_numero ?? ""}
                placeholder="Ex: 79/FMAS/2026"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data do ofício</label>
              <input name="oficio_data" type="date" defaultValue={encerramento?.oficio_data ?? ""}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Órgão emissor</label>
              <input name="oficio_orgao" type="text" defaultValue={encerramento?.oficio_orgao ?? ""}
                placeholder="Ex: SEMAS/FMAS Nova Iguaçu"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Observações do ofício</label>
            <textarea name="oficio_observacoes" rows={3} defaultValue={encerramento?.oficio_observacoes ?? ""}
              placeholder="Cole aqui o trecho relevante do ofício"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
          </div>

          <button type="submit" disabled={savando === "oficio"}
            className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50">
            {savando === "oficio" ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Salvar ofício
          </button>
        </form>
      </section>

      {/* PARTE 2: REGISTRAR DEVOLUÇÃO */}
      {encerramento && encerramento.status !== "pendente" && encerramento.valor_a_devolver > 0 && (
        <section className={`bg-white border rounded-2xl p-5 shadow-sm ${encerramento.devolucao_data ? "border-emerald-300" : "border-slate-200"}`}>
          <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <span className="bg-[#1e3a8a] text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-xs">2</span>
            Registrar Devolução
            {encerramento.devolucao_data && <span className="text-xs text-emerald-700 ml-2">✓ feita em {new Date(encerramento.devolucao_data).toLocaleDateString("pt-BR")}</span>}
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Após a transferência bancária ao órgão, registre o comprovante.
          </p>

          <form action={(fd) => handle("devolucao", () => registrarDevolucao(convenioId, fd))} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Data da devolução</label>
                <input name="devolucao_data" type="date"
                  defaultValue={encerramento.devolucao_data ?? new Date().toISOString().slice(0,10)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">URL do comprovante (opcional)</label>
                <input name="devolucao_comprovante" type="text"
                  defaultValue={encerramento.devolucao_comprovante ?? ""}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
              </div>
            </div>
            <button type="submit" disabled={savando === "devolucao"}
              className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50">
              {savando === "devolucao" ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              Registrar devolução
            </button>
          </form>
        </section>
      )}

      {/* PARTE 3: PRORROGAÇÃO / FINALIZAÇÃO */}
      {encerramento && (encerramento.status === "devolvido" || (encerramento.valor_a_devolver === 0 && encerramento.status !== "pendente")) && encerramento.status !== "renovado" && encerramento.status !== "finalizado" && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <span className="bg-[#1e3a8a] text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-xs">3</span>
            Continuidade do convênio
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Escolha: criar prorrogação (saldo a manter já entra como entrada inicial) ou finalizar.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Prorrogação */}
            <form action={(fd) => handle("prorrogar", () => criarProrrogacao(convenioId, fd))}
              className="border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-slate-800 text-sm">🔄 Prorrogar / Criar aditivo</h3>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nova vigência início</label>
                <input name="vigencia_inicio" type="date" required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nova vigência fim</label>
                <input name="vigencia_fim" type="date" required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nº do termo aditivo (opcional)</label>
                <input name="aditivo_numero" type="text"
                  placeholder="Ex: 1º"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
              </div>

              <div className="text-xs text-slate-600 bg-blue-50 border border-blue-200 rounded p-2">
                💡 Vai criar novo convênio com <b>{encerramento ? Number(encerramento.valor_a_manter).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}) : "—"}</b> de saldo anterior já lançado.
              </div>

              <button type="submit" disabled={savando === "prorrogar"}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                {savando === "prorrogar" ? <Loader2 className="animate-spin" size={14} /> : <ArrowRight size={14} />}
                Criar prorrogação
              </button>
            </form>

            {/* Finalizar sem renovação */}
            <form action={() => handle("finalizar", () => finalizarSemRenovacao(convenioId))}
              className="border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-slate-800 text-sm">❌ Finalizar sem renovação</h3>
              <p className="text-xs text-slate-500">
                Marca este convênio como definitivamente encerrado. Nenhuma nova movimentação será permitida.
              </p>
              <button type="submit" disabled={savando === "finalizar"}
                className="w-full bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                {savando === "finalizar" ? <Loader2 className="animate-spin" size={14} /> : <XCircle size={14} />}
                Finalizar
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, name, defaultValue, hint }: { label: string; name: string; defaultValue: number; hint?: string }) {
  const formatted = (defaultValue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input name={name} type="text" defaultValue={formatted}
        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono text-right" />
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function SomaVerificacao({ calculo }: { calculo: CalculoEncerramento }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
      ℹ️ Saldo final em conta: <b>{calculo.saldo_final.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</b>.
      A soma de <em>manter + devolver</em> deve bater com esse valor (glosado já está descontado).
    </div>
  );
}
