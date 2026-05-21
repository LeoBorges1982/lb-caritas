import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listarOpcoesFormulario } from "@/lib/lancamentos";
import { criarReembolso } from "../actions";

export const dynamic = "force-dynamic";

export default async function NovoReembolsoPage() {
  const opcoes = await listarOpcoesFormulario();
  const primeiroConvenio = opcoes.convenios[0]?.id ?? "";
  const metasFiltradas = opcoes.metas.filter((m) => m.convenio_id === primeiroConvenio);
  const categoriasFiltradas = opcoes.categorias.filter((c) => c.convenio_id === primeiroConvenio);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/reembolsos" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a]">
          <ArrowLeft size={14} /> Voltar
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Nova solicitação de reembolso</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pra quando um colaborador adianta uma despesa do convênio e precisa ser reembolsado.
        </p>
      </div>

      <form action={criarReembolso} className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Convênio" obrigatorio>
              <select name="convenio_id" required className={inputCn} defaultValue={primeiroConvenio}>
                {opcoes.convenios.map((c) => (
                  <option key={c.id} value={c.id}>{c.numero}</option>
                ))}
              </select>
            </Field>
            <Field label="Data da despesa" obrigatorio>
              <input name="data_despesa" type="date" required className={inputCn} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Solicitante (nome completo)" obrigatorio>
              <input name="solicitante_nome" type="text" required placeholder="Ex: Andreia Florencio Felicio Pereira" className={inputCn} />
            </Field>
            <Field label="CPF do solicitante">
              <input name="solicitante_cpf" type="text" placeholder="000.000.000-00" className={inputCn} />
            </Field>
          </div>

          <Field label="Descrição da despesa adiantada" obrigatorio>
            <textarea name="descricao" required rows={2} placeholder="Ex: Compra de material de limpeza no Atacadão - manutenção do refeitório" className={inputCn} />
          </Field>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Valor (R$)" obrigatorio>
              <input name="valor" type="text" inputMode="decimal" required placeholder="0,00" className={inputCn} />
            </Field>
            <Field label="Nº do comprovante">
              <input name="comprovante_numero" type="text" placeholder="Nota/recibo" className={inputCn} />
            </Field>
            <Field label="Rubrica (categoria)">
              <select name="categoria_id" className={inputCn} defaultValue="">
                <option value="">— sem categoria —</option>
                {categoriasFiltradas.map((c) => (
                  <option key={c.id} value={c.id}>{c.codigo} · {c.nome}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Meta do plano">
            <select name="meta_id" className={inputCn} defaultValue="">
              <option value="">— sem meta —</option>
              {metasFiltradas.map((m) => (
                <option key={m.id} value={m.id}>{m.codigo} · {m.titulo.slice(0, 80)}</option>
              ))}
            </select>
          </Field>

          <Field label="Observações">
            <textarea name="observacoes" rows={2} placeholder="Notas internas..." className={inputCn} />
          </Field>
        </div>

        <div className="flex justify-end gap-2">
          <Link href="/reembolsos" className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</Link>
          <button type="submit" className="px-5 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-medium rounded-lg">
            Solicitar reembolso
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCn = "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]/60";

function Field({ label, obrigatorio, children }: { label: string; obrigatorio?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-700 block mb-1">
        {label} {obrigatorio && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
