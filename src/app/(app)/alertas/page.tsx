import Link from "next/link";
import { Bell, CheckCircle2, AlertTriangle, Info, ShieldAlert, Calendar } from "lucide-react";
import { listarAlertas, SEVERIDADE_LABEL, SEVERIDADE_CORES, SEVERIDADE_BADGE, SEVERIDADE_ORDEM, type SeveridadeAlerta } from "@/lib/alertas";
import { formatDate, cn } from "@/lib/utils";
import BotaoResolverAlerta from "@/components/BotaoResolverAlerta";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ filtro?: "abertos" | "resolvidos" | "todos"; severidade?: SeveridadeAlerta }>;
}

export default async function AlertasPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filtro = sp.filtro ?? "abertos";
  const severidade = sp.severidade;

  const lista = await listarAlertas({
    resolvido: filtro === "todos" ? undefined : filtro === "resolvidos",
    severidade,
  });

  const ordenados = [...lista].sort((a, b) => {
    if (a.resolvido !== b.resolvido) return a.resolvido ? 1 : -1;
    return SEVERIDADE_ORDEM[a.severidade] - SEVERIDADE_ORDEM[b.severidade];
  });

  const stats = lista.reduce(
    (acc, a) => {
      if (a.resolvido) acc.resolvidos++;
      else {
        acc.abertos++;
        acc[a.severidade]++;
      }
      return acc;
    },
    { abertos: 0, resolvidos: 0, critico: 0, aviso: 0, info: 0 }
  );

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Bell size={22} className="text-[#1e3a8a]" />
          Alertas
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Pendências e avisos operacionais dos convênios
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <KPI titulo="Críticos" valor={stats.critico} cor="text-red-700" icon={<ShieldAlert size={14} />} />
        <KPI titulo="Avisos" valor={stats.aviso} cor="text-amber-700" icon={<AlertTriangle size={14} />} />
        <KPI titulo="Informativos" valor={stats.info} cor="text-blue-700" icon={<Info size={14} />} />
        <KPI titulo="Resolvidos" valor={stats.resolvidos} cor="text-emerald-700" icon={<CheckCircle2 size={14} />} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Filtro:</span>
        <FiltroBtn href="/alertas?filtro=abertos" ativo={filtro === "abertos"}>Em aberto</FiltroBtn>
        <FiltroBtn href="/alertas?filtro=resolvidos" ativo={filtro === "resolvidos"}>Resolvidos</FiltroBtn>
        <FiltroBtn href="/alertas?filtro=todos" ativo={filtro === "todos"}>Todos</FiltroBtn>
      </div>

      {ordenados.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-3" />
          <p className="text-slate-700 font-medium">Nenhum alerta {filtro === "abertos" ? "em aberto" : filtro === "resolvidos" ? "resolvido" : ""}</p>
          <p className="text-sm text-slate-500 mt-1">
            {filtro === "abertos" ? "Tudo em ordem por aqui." : "Ajuste o filtro pra ver mais."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {ordenados.map((a) => (
            <div
              key={a.id}
              className={cn(
                "border rounded-2xl p-4 shadow-sm",
                a.resolvido ? "bg-slate-50 border-slate-200 opacity-75" : SEVERIDADE_CORES[a.severidade]
              )}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  {a.severidade === "critico" ? <ShieldAlert size={18} /> :
                   a.severidade === "aviso" ? <AlertTriangle size={18} /> :
                   <Info size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border uppercase", SEVERIDADE_BADGE[a.severidade])}>
                      {SEVERIDADE_LABEL[a.severidade]}
                    </span>
                    {a.convenio_id && a.convenio_numero && (
                      <Link href={`/convenios/${a.convenio_id}`} className="text-xs font-mono text-[#1e3a8a] hover:underline">
                        {a.convenio_numero}
                      </Link>
                    )}
                    <span className="text-[10px] text-slate-500 uppercase">{a.tipo}</span>
                  </div>
                  <h3 className="text-sm font-semibold leading-snug">{a.titulo}</h3>
                  {a.mensagem && (
                    <p className="text-xs mt-1 leading-relaxed opacity-90">{a.mensagem}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] opacity-75">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} /> Criado em {formatDate(a.criado_em)}
                    </span>
                    {a.vencimento && (
                      <span className="flex items-center gap-1">
                        <Calendar size={11} /> Vence em {formatDate(a.vencimento)}
                      </span>
                    )}
                    {a.resolvido && a.resolvido_em && (
                      <span className="flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 size={11} /> Resolvido em {formatDate(a.resolvido_em)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <BotaoResolverAlerta id={a.id} resolvido={a.resolvido} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KPI({ titulo, valor, cor, icon }: { titulo: string; valor: number; cor: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-500">
        {icon} {titulo}
      </div>
      <div className={cn("text-2xl font-bold mt-1", cor)}>{valor}</div>
    </div>
  );
}

function FiltroBtn({ href, ativo, children }: { href: string; ativo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "px-3 py-1.5 rounded-lg text-sm font-medium transition",
        ativo ? "bg-[#1e3a8a] text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
      )}
    >
      {children}
    </Link>
  );
}
