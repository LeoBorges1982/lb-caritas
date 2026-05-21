"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Save, X } from "lucide-react";
import {
  TIPO_LABEL,
  FORMA_PAGAMENTO_LABEL,
  DOCUMENTO_TIPO_LABEL,
  type TipoLancamento,
  type Lancamento,
  type OpcoesFormulario,
} from "@/lib/lancamentos";
import { cn } from "@/lib/utils";

interface Props {
  modo: "criar" | "editar";
  opcoes: OpcoesFormulario;
  inicial?: Lancamento | null;
  action: (fd: FormData) => Promise<void>;
}

const TIPOS_DISPONIVEIS: TipoLancamento[] = ["despesa", "repasse", "rendimento", "devolucao", "estorno"];

export default function LancamentoForm({ modo, opcoes, inicial, action }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [convenioId, setConvenioId] = useState<string>(inicial?.convenio_id ?? opcoes.convenios[0]?.id ?? "");
  const [tipo, setTipo] = useState<TipoLancamento>(inicial?.tipo ?? "despesa");

  const metasFiltradas = useMemo(
    () => opcoes.metas.filter((m) => m.convenio_id === convenioId),
    [opcoes.metas, convenioId]
  );
  const categoriasFiltradas = useMemo(
    () => opcoes.categorias.filter((c) => c.convenio_id === convenioId),
    [opcoes.categorias, convenioId]
  );

  const ehDespesa = tipo === "despesa";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await action(fd);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro desconhecido");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {erro && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* Bloco 1 — Identificação */}
      <Section titulo="Identificação">
        <Grid>
          <Field label="Convênio" obrigatorio>
            <select
              name="convenio_id"
              required
              className={inputCn}
              value={convenioId}
              onChange={(e) => setConvenioId(e.target.value)}
            >
              {opcoes.convenios.map((c) => (
                <option key={c.id} value={c.id}>{c.numero}</option>
              ))}
            </select>
          </Field>

          <Field label="Tipo" obrigatorio>
            <select
              name="tipo"
              required
              className={inputCn}
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoLancamento)}
            >
              {TIPOS_DISPONIVEIS.map((t) => (
                <option key={t} value={t}>{TIPO_LABEL[t]}</option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select name="status" defaultValue={inicial?.status === "realizado" ? "realizado" : "previsto"} className={inputCn}>
              <option value="previsto">Previsto</option>
              <option value="realizado">Realizado</option>
            </select>
          </Field>
        </Grid>

        <Grid>
          <Field label="Categoria (rubrica)" hint={ehDespesa ? "Obrigatória para despesas" : "Opcional"}>
            <select name="categoria_id" defaultValue={inicial?.categoria_id ?? ""} className={inputCn}>
              <option value="">— sem categoria —</option>
              {categoriasFiltradas.map((c) => (
                <option key={c.id} value={c.id}>{c.codigo} · {c.nome}</option>
              ))}
            </select>
          </Field>

          <Field label="Meta" hint="Vincular à meta do plano">
            <select name="meta_id" defaultValue={inicial?.meta_id ?? ""} className={inputCn}>
              <option value="">— sem meta —</option>
              {metasFiltradas.map((m) => (
                <option key={m.id} value={m.id}>{m.codigo} · {m.titulo.slice(0, 80)}</option>
              ))}
            </select>
          </Field>
        </Grid>

        <Field label="Descrição" obrigatorio>
          <textarea
            name="descricao"
            required
            rows={2}
            placeholder="Ex: Pagamento de salário cozinheira - referência abril/2025"
            defaultValue={inicial?.descricao ?? ""}
            className={inputCn}
          />
        </Field>
      </Section>

      {/* Bloco 2 — Valor e datas */}
      <Section titulo="Valor e datas">
        <Grid>
          <Field label="Valor (R$)" obrigatorio>
            <input
              name="valor"
              type="text"
              inputMode="decimal"
              required
              placeholder="0,00"
              defaultValue={inicial ? inicial.valor.toString().replace(".", ",") : ""}
              className={inputCn}
            />
          </Field>

          <Field label="Data lançamento" obrigatorio>
            <input
              name="data_lancamento"
              type="date"
              required
              defaultValue={inicial?.data_lancamento ?? new Date().toISOString().slice(0, 10)}
              className={inputCn}
            />
          </Field>

          <Field label="Data pagamento" hint="Quando efetivamente saiu/entrou na conta">
            <input
              name="data_pagamento"
              type="date"
              defaultValue={inicial?.data_pagamento ?? ""}
              className={inputCn}
            />
          </Field>
        </Grid>

        <Grid>
          <Field label="Forma de pagamento">
            <select name="forma_pagamento" defaultValue={inicial?.forma_pagamento ?? ""} className={inputCn}>
              <option value="">—</option>
              {Object.entries(FORMA_PAGAMENTO_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>

          <Field label="Conta origem">
            <select name="conta_origem" defaultValue={inicial?.conta_origem ?? ""} className={inputCn}>
              <option value="">—</option>
              <option value="corrente">Conta corrente</option>
              <option value="aplicacao">Conta aplicação</option>
            </select>
          </Field>
        </Grid>
      </Section>

      {/* Bloco 3 — Fornecedor + Documento (só pra despesas) */}
      {ehDespesa && (
        <Section titulo="Fornecedor e documento fiscal" hint="Obrigatório para prestação de contas">
          <Grid>
            <Field label="Fornecedor (nome / razão social)">
              <input
                name="fornecedor_nome"
                type="text"
                placeholder="Ex: Cereais da Vila Ltda"
                defaultValue={inicial?.fornecedor_nome ?? ""}
                className={inputCn}
              />
            </Field>

            <Field label="CNPJ / CPF do fornecedor">
              <input
                name="fornecedor_documento"
                type="text"
                placeholder="00.000.000/0000-00"
                defaultValue={inicial?.fornecedor_documento ?? ""}
                className={inputCn}
              />
            </Field>
          </Grid>

          <Grid cols={4}>
            <Field label="Tipo de documento">
              <select name="documento_tipo" defaultValue={inicial?.documento_tipo ?? ""} className={inputCn}>
                <option value="">—</option>
                {Object.entries(DOCUMENTO_TIPO_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>

            <Field label="Número do documento">
              <input
                name="documento_numero"
                type="text"
                placeholder="Ex: 12345"
                defaultValue={inicial?.documento_numero ?? ""}
                className={inputCn}
              />
            </Field>

            <Field label="Data do documento">
              <input
                name="documento_data"
                type="date"
                defaultValue={inicial?.documento_data ?? ""}
                className={inputCn}
              />
            </Field>

            <Field label="Valor do documento (R$)">
              <input
                name="documento_valor"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                defaultValue={inicial?.documento_valor ? inicial.documento_valor.toString().replace(".", ",") : ""}
                className={inputCn}
              />
            </Field>
          </Grid>
        </Section>
      )}

      {/* Bloco 4 — Observações */}
      <Section titulo="Observações">
        <Field label="">
          <textarea
            name="observacoes"
            rows={3}
            placeholder="Notas internas, contexto, justificativas..."
            defaultValue={inicial?.observacoes ?? ""}
            className={inputCn}
          />
        </Field>
      </Section>

      {/* Ações */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition flex items-center gap-1.5"
          disabled={pending}
        >
          <X size={14} /> Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-medium rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
        >
          <Save size={14} /> {pending ? "Salvando..." : modo === "criar" ? "Criar lançamento" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}

const inputCn =
  "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]/60";

function Section({ titulo, hint, children }: { titulo: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">{titulo}</h2>
        {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Grid({ cols = 3, children }: { cols?: 2 | 3 | 4; children: React.ReactNode }) {
  const c = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" }[cols];
  return <div className={cn("grid gap-4", c)}>{children}</div>;
}

function Field({ label, hint, obrigatorio, children }: {
  label: string;
  hint?: string;
  obrigatorio?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      {label && (
        <span className="text-xs font-medium text-slate-700 block mb-1">
          {label}
          {obrigatorio && <span className="text-red-500 ml-1">*</span>}
        </span>
      )}
      {children}
      {hint && <span className="text-[11px] text-slate-500 block mt-1">{hint}</span>}
    </label>
  );
}
