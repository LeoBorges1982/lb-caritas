import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileSignature, AlertCircle, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { buscarConvenio } from "@/lib/convenios";
import { calcularEncerramento, obterEncerramento, STATUS_ENCERRAMENTO_LABEL, STATUS_ENCERRAMENTO_CORES } from "@/lib/encerramentos";
import { formatBRL, formatDate, cn } from "@/lib/utils";
import EncerramentoForm from "./EncerramentoForm";

export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ id: string }> }

export default async function EncerrarPage({ params }: PageProps) {
  const { id } = await params;
  const conv = await buscarConvenio(id);
  if (!conv) notFound();

  const [calc, enc] = await Promise.all([
    calcularEncerramento(id),
    obterEncerramento(id),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/convenios/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a]">
          <ArrowLeft size={14} /> Voltar ao convênio
        </Link>
        {enc && (
          <span className={cn("inline-flex px-3 py-1 rounded-full text-xs font-medium border", STATUS_ENCERRAMENTO_CORES[enc.status])}>
            {STATUS_ENCERRAMENTO_LABEL[enc.status]}
          </span>
        )}
      </div>

      <header className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
          <FileSignature size={14} /> Encerramento de Convênio
        </div>
        <h1 className="text-xl font-bold text-slate-900">{conv.numero}</h1>
        <p className="text-sm text-slate-600 mt-1">
          Vigência: {formatDate(conv.vigencia_inicio)} a {formatDate(conv.vigencia_fim)}
        </p>
      </header>

      {/* Saldo calculado */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-3 text-sm uppercase tracking-wide">📊 Saldo final calculado pelo sistema</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Stat label="Entradas totais" valor={formatBRL(calc.total_entradas)} />
          <Stat label="Saídas aceitas" valor={formatBRL(calc.total_saidas)} />
          <Stat label="Glosado" valor={formatBRL(calc.valor_glosado)} cor="text-amber-700" />
          <Stat label="Saldo na conta" valor={formatBRL(calc.saldo_final)} cor="text-[#1e3a8a]" destaque />
        </div>
        <div className="text-xs text-slate-500 mt-3">
          Previsto: {formatBRL(calc.despesas_previstas)} · Realizado: {formatBRL(calc.despesas_realizadas)} · Executado a menor: {formatBRL(calc.executado_menor)}
        </div>
      </div>

      {/* Form principal */}
      <EncerramentoForm
        convenioId={id}
        calculo={calc}
        encerramento={enc}
      />

      {/* Indicadores próximos passos */}
      {enc && enc.status === "oficio_recebido" && (
        <Aviso icone={<AlertCircle size={18} />} tipo="alerta">
          Ofício registrado. Próximo passo: <strong>registrar a devolução</strong> de {formatBRL(enc.valor_a_devolver)} na seção abaixo.
        </Aviso>
      )}
      {enc && enc.status === "devolvido" && (
        <Aviso icone={<CheckCircle2 size={18} />} tipo="ok">
          Devolução de {formatBRL(enc.valor_a_devolver)} registrada. Agora você pode criar a <strong>prorrogação</strong> ou <strong>finalizar</strong> sem renovação.
        </Aviso>
      )}
      {enc && enc.status === "renovado" && enc.convenio_sucessor_id && (
        <Aviso icone={<RefreshCw size={18} />} tipo="ok">
          Convênio renovado. <Link href={`/convenios/${enc.convenio_sucessor_id}`} className="underline font-semibold">Abrir o novo convênio</Link>
        </Aviso>
      )}
      {enc && enc.status === "finalizado" && (
        <Aviso icone={<XCircle size={18} />} tipo="info">
          Convênio finalizado sem renovação.
        </Aviso>
      )}
    </div>
  );
}

function Stat({ label, valor, cor, destaque }: { label: string; valor: string; cor?: string; destaque?: boolean }) {
  return (
    <div className={cn("bg-slate-50 rounded-lg p-3 border", destaque ? "border-[#1e3a8a]/30 ring-1 ring-[#1e3a8a]/10" : "border-slate-200")}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={cn("text-base font-bold mt-0.5", cor || "text-slate-900")}>{valor}</div>
    </div>
  );
}

function Aviso({ icone, tipo, children }: { icone: React.ReactNode; tipo: "alerta" | "ok" | "info"; children: React.ReactNode }) {
  const cor =
    tipo === "alerta" ? "bg-amber-50 border-amber-200 text-amber-900" :
    tipo === "ok"     ? "bg-emerald-50 border-emerald-200 text-emerald-900" :
                        "bg-slate-50 border-slate-200 text-slate-700";
  return (
    <div className={cn("border rounded-xl p-4 flex items-start gap-3 text-sm", cor)}>
      {icone}
      <div>{children}</div>
    </div>
  );
}
