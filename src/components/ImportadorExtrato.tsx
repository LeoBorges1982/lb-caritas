"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertTriangle, CheckCircle2, ArrowRight, Loader2, FileText } from "lucide-react";
import { formatBRL, formatDate, cn } from "@/lib/utils";
import { gerarPreview, importarDecisoes, type PreviewResult, type DecisaoLinha } from "@/app/(app)/lancamentos/importar/actions";

interface Props {
  convenios: { id: string; numero: string }[];
}

type Acao = "conciliar" | "criar" | "ignorar";

export default function ImportadorExtrato({ convenios }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  // Step 1: upload
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [convenioId, setConvenioId] = useState(convenios[0]?.id ?? "");
  const [contaOrigem, setContaOrigem] = useState<"corrente" | "aplicacao">("corrente");

  // Step 2: preview
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [acoes, setAcoes] = useState<Record<string, Acao>>({});

  function handleGerarPreview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    if (!arquivo) {
      setErro("Selecione o arquivo do extrato.");
      return;
    }
    const fd = new FormData();
    fd.append("arquivo", arquivo);
    fd.append("convenio_id", convenioId);

    startTransition(async () => {
      try {
        const result = await gerarPreview(fd);
        setPreview(result);
        // Inicializa acoes com as sugestões
        const novas: Record<string, Acao> = {};
        for (const m of result.matches) novas[m.transacao.fitid] = m.acao;
        setAcoes(novas);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro ao processar extrato");
      }
    });
  }

  function handleConfirmar() {
    if (!preview) return;
    setErro(null);
    const decisoes: DecisaoLinha[] = preview.matches.map((m) => ({
      fitid: m.transacao.fitid,
      acao: acoes[m.transacao.fitid] ?? "ignorar",
      match_id: m.match?.id,
      transacao: m.transacao,
    }));

    startTransition(async () => {
      try {
        const r = await importarDecisoes(convenioId, contaOrigem, decisoes);
        alert(
          `Importação concluída:\n` +
          `• ${r.criados} novo(s) lançamento(s)\n` +
          `• ${r.conciliados} conciliado(s)\n` +
          `• ${r.ignorados} ignorado(s)`
        );
        router.push("/lancamentos");
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro ao importar");
      }
    });
  }

  // Step 1 — upload
  if (!preview) {
    return (
      <form onSubmit={handleGerarPreview} className="space-y-5 max-w-3xl">
        {erro && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-700 block mb-1">
                Convênio <span className="text-red-500">*</span>
              </span>
              <select
                value={convenioId}
                onChange={(e) => setConvenioId(e.target.value)}
                required
                className={inputCn}
              >
                {convenios.map((c) => (
                  <option key={c.id} value={c.id}>{c.numero}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700 block mb-1">
                Conta de origem <span className="text-red-500">*</span>
              </span>
              <select
                value={contaOrigem}
                onChange={(e) => setContaOrigem(e.target.value as "corrente" | "aplicacao")}
                className={inputCn}
              >
                <option value="corrente">Conta corrente</option>
                <option value="aplicacao">Conta aplicação</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-slate-700 block mb-1">
              Arquivo do extrato <span className="text-red-500">*</span>
            </span>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-[#1e3a8a]/40 transition cursor-pointer">
              <input
                type="file"
                accept=".ofx,.csv,.txt"
                onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload size={28} className="mx-auto text-slate-400 mb-2" />
                {arquivo ? (
                  <div>
                    <div className="text-sm font-medium text-slate-800 flex items-center justify-center gap-1.5">
                      <FileText size={14} /> {arquivo.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {(arquivo.size / 1024).toFixed(1)} KB · clique pra trocar
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-medium text-slate-700">
                      Clique pra selecionar o arquivo
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Formatos aceitos: .ofx (Caixa, Itaú, BB) ou .csv
                    </div>
                  </>
                )}
              </label>
            </div>
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending || !arquivo}
            className="px-5 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-medium rounded-lg flex items-center gap-1.5 disabled:opacity-50"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
            {pending ? "Processando..." : "Gerar preview"}
          </button>
        </div>
      </form>
    );
  }

  // Step 2 — preview
  const totalSelecionado = Object.values(acoes).filter((a) => a !== "ignorar").length;

  return (
    <div className="space-y-5">
      {erro && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <KPI titulo="Transações no extrato" valor={String(preview.total)} sub={`Formato ${preview.formato.toUpperCase()}`} />
        <KPI titulo="Entradas" valor={formatBRL(preview.totalEntradas)} cor="text-emerald-700" />
        <KPI titulo="Saídas" valor={formatBRL(preview.totalSaidas)} cor="text-red-600" />
        <KPI titulo="Conciliáveis / Novos" valor={`${preview.conciliaveis} / ${preview.novos}`} sub="auto-detectado" />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Data</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Histórico</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Valor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Ação</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Match</th>
            </tr>
          </thead>
          <tbody>
            {preview.matches.map((m) => {
              const fitid = m.transacao.fitid;
              const acao = acoes[fitid] ?? "ignorar";
              return (
                <tr key={fitid} className={cn(
                  "border-b border-slate-100 last:border-0",
                  acao === "ignorar" && "opacity-50"
                )}>
                  <td className="px-4 py-3 text-sm whitespace-nowrap text-slate-700">{formatDate(m.transacao.data)}</td>
                  <td className="px-4 py-3 text-sm text-slate-800 max-w-[400px]">
                    <div className="line-clamp-2">{m.transacao.memo || "—"}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{fitid.slice(0, 40)}</div>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className={cn(
                      "text-sm font-semibold",
                      m.transacao.tipo === "C" ? "text-emerald-700" : "text-slate-800"
                    )}>
                      {m.transacao.tipo === "C" ? "+" : "-"}{formatBRL(m.transacao.valor)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={acao}
                      onChange={(e) => setAcoes({ ...acoes, [fitid]: e.target.value as Acao })}
                      className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                    >
                      {m.match && <option value="conciliar">✓ Conciliar match</option>}
                      <option value="criar">+ Criar novo</option>
                      <option value="ignorar">— Ignorar</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {m.match ? (
                      <div className="text-slate-600">
                        <span className="font-medium text-emerald-700">{m.match.tipo}</span>
                        {" · "}
                        {formatDate(m.match.data_lancamento)}
                        <div className="text-slate-500 line-clamp-1 max-w-[300px]">{m.match.descricao}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400">sem match</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => setPreview(null)}
          className="text-sm text-slate-500 hover:text-slate-700"
          disabled={pending}
        >
          ← Voltar e escolher outro arquivo
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{totalSelecionado} de {preview.total} serão processados</span>
          <button
            onClick={handleConfirmar}
            disabled={pending || totalSelecionado === 0}
            className="px-5 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-medium rounded-lg flex items-center gap-1.5 disabled:opacity-50"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {pending ? "Importando..." : "Confirmar importação"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCn =
  "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]/60";

function KPI({ titulo, valor, sub, cor }: { titulo: string; valor: string; sub?: string; cor?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{titulo}</div>
      <div className={cn("text-xl font-bold mt-1", cor ?? "text-slate-900")}>{valor}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
