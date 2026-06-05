import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileSpreadsheet, CheckCircle2, Download } from "lucide-react";
import { buscarConvenio } from "@/lib/convenios";
import { listarRubricas } from "@/lib/rubricas";
import { adminClient } from "@/lib/supabase/admin";
import { formatBRL } from "@/lib/utils";
import { salvarPlanoTrabalho, carregarPlanoCasaSolidariedade } from "./actions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvo?: string; carregado?: string }>;
}

export default async function PlanoTrabalhoPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { salvo, carregado } = await searchParams;

  const [convenio, resumo] = await Promise.all([
    buscarConvenio(id),
    listarRubricas(id),
  ]);
  if (!convenio) notFound();

  // Busca dados completos do convênio (saldo anterior carimbado)
  const supabase = adminClient();
  const { data: convFull } = await supabase
    .from("caritas_convenios")
    .select("saldo_anterior, saldo_anterior_categoria_id, saldo_anterior_oficio, saldo_anterior_convenio")
    .eq("id", id)
    .maybeSingle();

  const rubricasFlat = resumo.grupos.flatMap((g) => g.rubricas);

  const salvarBound = salvarPlanoTrabalho.bind(null, id);
  const carregarBound = carregarPlanoCasaSolidariedade.bind(null, id);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <Link href={`/convenios/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a]">
          <ArrowLeft size={14} /> Voltar ao convênio
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mt-2">
          <FileSpreadsheet size={22} className="text-[#1e3a8a]" />
          Plano de Trabalho
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Tetos por rubrica · {convenio.numero} · base para validação de lançamentos
        </p>
      </div>

      {salvo && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg p-3 flex items-center gap-2">
          <CheckCircle2 size={16} /> Plano salvo com sucesso.
        </div>
      )}
      {carregado && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg p-3 flex items-center gap-2">
          <CheckCircle2 size={16} /> Plano da Casa da Solidariedade carregado.
        </div>
      )}

      {/* Botão de pré-carga */}
      {rubricasFlat.length === 0 && (
        <form action={carregarBound} className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 flex items-center gap-2 text-sm">
            <Download size={16} /> Carregar plano padrão da Casa da Solidariedade
          </h3>
          <p className="text-xs text-blue-700 mt-1">
            Pré-preenche as 5 rubricas (R$ 155.404,44/ano) + saldo anterior carimbado de R$ 19.888,31 (provisionamento) conforme ofício 79/FMAS/2026.
          </p>
          <button type="submit" className="mt-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            Carregar plano padrão
          </button>
        </form>
      )}

      <form action={salvarBound} className="space-y-6">
        {/* Saldo anterior carimbado */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 text-sm mb-3">Saldo anterior carimbado</h2>
          <p className="text-xs text-slate-500 mb-4">
            Saldo de convênio anterior cuja manutenção foi autorizada (ex: provisionamento trabalhista).
            Só pode ser usado na rubrica de destino.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <input
                name="saldo_anterior_valor"
                type="text"
                inputMode="decimal"
                defaultValue={convFull?.saldo_anterior ? String(convFull.saldo_anterior).replace(".", ",") : ""}
                placeholder="19.888,31"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </Field>
            <Field label="Rubrica destino">
              <select
                name="saldo_anterior_categoria_id"
                defaultValue={convFull?.saldo_anterior_categoria_id ?? ""}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="">— Selecione —</option>
                {rubricasFlat.map((r) => (
                  <option key={r.id} value={r.id}>{r.codigo} · {r.nome}</option>
                ))}
              </select>
            </Field>
            <Field label="Ofício de autorização">
              <input
                name="saldo_anterior_oficio"
                type="text"
                defaultValue={convFull?.saldo_anterior_oficio ?? ""}
                placeholder="79/FMAS/2026 §8"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </Field>
            <Field label="Convênio de origem">
              <input
                name="saldo_anterior_convenio"
                type="text"
                defaultValue={convFull?.saldo_anterior_convenio ?? ""}
                placeholder="001/FMAS/2025"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </Field>
          </div>
        </div>

        {/* Tabela editável de tetos */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
            <h2 className="font-semibold text-slate-900 text-sm">Tetos por rubrica</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Corrente = teto mensal estrito. Provisionamento = acumula mês a mês (rescisão, férias, 13º).
            </p>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 uppercase">
              <tr>
                <th className="text-left px-4 py-2 w-20">Código</th>
                <th className="text-left px-4 py-2">Rubrica</th>
                <th className="text-left px-4 py-2 w-44">Tipo</th>
                <th className="text-right px-4 py-2 w-32">Mensal (R$)</th>
                <th className="text-right px-4 py-2 w-32">Anual (R$)</th>
                <th className="text-center px-4 py-2 w-20">Meses</th>
              </tr>
            </thead>
            <tbody>
              {rubricasFlat.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-sm text-slate-500">
                    Nenhuma rubrica cadastrada. Use o botão acima pra carregar o plano padrão.
                  </td>
                </tr>
              ) : rubricasFlat.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-4 py-2 text-sm font-mono text-slate-700">{r.codigo}</td>
                  <td className="px-4 py-2 text-sm text-slate-800">{r.nome}</td>
                  <td className="px-4 py-2">
                    <select
                      name={`cat_${r.id}_tipo`}
                      defaultValue={r.tipo_acumulo}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                    >
                      <option value="corrente">Corrente</option>
                      <option value="provisionamento">Provisionamento</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      name={`cat_${r.id}_mensal`}
                      type="text"
                      inputMode="decimal"
                      defaultValue={r.valor_mensal_previsto > 0 ? String(r.valor_mensal_previsto).replace(".", ",") : ""}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-right font-mono"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      name={`cat_${r.id}_anual`}
                      type="text"
                      inputMode="decimal"
                      defaultValue={r.valor_previsto > 0 ? String(r.valor_previsto).replace(".", ",") : ""}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-right font-mono"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      name={`cat_${r.id}_meses`}
                      type="number"
                      min={1}
                      max={36}
                      defaultValue={r.meses_cronograma || 12}
                      className="w-14 px-2 py-1 border border-slate-300 rounded text-xs text-center"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            {rubricasFlat.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-xs font-semibold text-slate-700">
                    TOTAL GERAL
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-bold text-slate-900 font-mono">
                    {formatBRL(rubricasFlat.reduce((s, r) => s + r.valor_mensal_previsto, 0))}
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-bold text-slate-900 font-mono">
                    {formatBRL(rubricasFlat.reduce((s, r) => s + r.valor_previsto, 0))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {rubricasFlat.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <Link
              href={`/convenios/${id}/rubricas`}
              className="text-sm text-slate-600 hover:text-[#1e3a8a]"
            >
              Ver execução das rubricas →
            </Link>
            <button
              type="submit"
              className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-medium px-5 py-2 rounded-lg"
            >
              Salvar plano de trabalho
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
