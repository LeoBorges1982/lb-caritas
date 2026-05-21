import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, UserPlus } from "lucide-react";
import { buscarConvenio } from "@/lib/convenios";
import { listarAcessosDoConvenio, listarUsuariosDoPortal, PAPEL_DESCRICAO } from "@/lib/acessos";
import AcessoLinha from "@/components/AcessoLinha";
import { adicionarAcesso } from "./actions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AcessosPage({ params }: PageProps) {
  const { id } = await params;
  const [convenio, acessos, usuarios] = await Promise.all([
    buscarConvenio(id),
    listarAcessosDoConvenio(id),
    listarUsuariosDoPortal(),
  ]);
  if (!convenio) notFound();

  const idsComAcesso = new Set(acessos.map((a) => a.usuario_id));
  const usuariosDisponiveis = usuarios.filter((u) => !idsComAcesso.has(u.id));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href={`/convenios/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a]">
          <ArrowLeft size={14} /> Voltar ao convênio
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2 flex items-center gap-2">
          <Users size={22} className="text-[#1e3a8a]" />
          Acessos do convênio
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Quem pode ver e operar o convênio <span className="font-mono">{convenio.numero}</span>.
          Administradores do Portal acessam todos os convênios automaticamente.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mb-3">
          <UserPlus size={14} /> Adicionar usuário
        </h2>
        {usuariosDisponiveis.length === 0 ? (
          <p className="text-xs text-slate-500">
            Todos os usuários do Portal já têm acesso. Pra cadastrar novos, vá no Portal LB.
          </p>
        ) : (
          <form action={adicionarAcesso} className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <input type="hidden" name="convenio_id" value={id} />
            <select name="usuario_id" required className={inputCn}>
              <option value="">— selecione um usuário —</option>
              {usuariosDisponiveis.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome ? `${u.nome} (${u.email})` : u.email}
                </option>
              ))}
            </select>
            <select name="papel" required defaultValue="visualizador" className={inputCn}>
              <option value="visualizador">Visualizador</option>
              <option value="operador">Operador</option>
              <option value="gestor">Gestor</option>
            </select>
            <button
              type="submit"
              className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              Adicionar
            </button>
          </form>
        )}
        <div className="grid gap-2 md:grid-cols-3 mt-3 text-[11px] text-slate-500">
          <div><strong className="text-slate-700">Visualizador:</strong> {PAPEL_DESCRICAO.visualizador}</div>
          <div><strong className="text-slate-700">Operador:</strong> {PAPEL_DESCRICAO.operador}</div>
          <div><strong className="text-slate-700">Gestor:</strong> {PAPEL_DESCRICAO.gestor}</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Usuário</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Papel</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {acessos.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">
                  Nenhum usuário com acesso explícito. Apenas administradores do Portal podem ver.
                </td>
              </tr>
            ) : (
              acessos.map((a) => (
                <AcessoLinha
                  key={a.id}
                  id={a.id}
                  convenioId={id}
                  nome={a.nome}
                  email={a.email}
                  papel={a.papel}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputCn =
  "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]/60";
