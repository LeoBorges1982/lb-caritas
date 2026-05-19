import { getSessao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sessao = await getSessao();
  const nome = sessao?.nome || sessao?.email?.split("@")[0] || "usuário";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Caritas</h1>
        <p className="text-sm text-slate-500 mt-1">
          Sistema de gestão de convênios públicos · Lei 13.019/2014
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Bem-vindo</div>
          <div className="text-lg font-semibold text-slate-800">
            Olá, {nome}! Sistema pronto.
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Fundação criada. Próximos sprints: tabelas Supabase + módulos de negócio.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Convênio piloto</div>
          <div className="text-lg font-semibold text-[#1e3a8a]">
            Convênio 001/FMAS/2025
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Cáritas Diocesana de Nova Iguaçu · SEMAS
          </p>
        </div>
      </div>
    </div>
  );
}
