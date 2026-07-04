import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import { formatDate, ROLES } from "@/lib/utils";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { updateUserAccess } from "./actions";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) redirect("/dashboard");

  const db = adminClient();
  const [{ data: users }, { data: members }] = await Promise.all([
    db.from("rcc_users").select("*").order("created_at", { ascending: false }),
    db.from("rcc_members").select("id, full_name").order("full_name"),
  ]);

  const pendentes = (users ?? []).filter((u) => u.status === "pendente");
  const outros = (users ?? []).filter((u) => u.status !== "pendente");

  const UserRow = ({ u }: { u: NonNullable<typeof users>[number] }) => (
    <Card key={u.id} className={u.status === "pendente" ? "border-amber-300" : ""}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 truncate">{u.name}</p>
          <p className="text-xs text-slate-500 truncate">
            {u.email} · desde {formatDate(u.created_at)}
          </p>
        </div>
        <Badge value={u.status} />
      </div>

      <form action={updateUserAccess.bind(null, u.id)} className="grid gap-2 sm:grid-cols-5">
        <select name="role" defaultValue={u.role} className="rounded-xl border border-slate-300 px-2.5 py-2 text-sm bg-white">
          {Object.entries(ROLES).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select name="status" defaultValue={u.status} className="rounded-xl border border-slate-300 px-2.5 py-2 text-sm bg-white">
          <option value="pendente">Pendente</option>
          <option value="ativo">Ativo</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
        <select name="member_id" defaultValue={u.member_id ?? ""} className="rounded-xl border border-slate-300 px-2.5 py-2 text-sm bg-white">
          <option value="">Sem ficha de membro</option>
          {(members ?? []).map((m) => (
            <option key={m.id} value={m.id}>{m.full_name}</option>
          ))}
        </select>
        <input
          name="led_groups"
          defaultValue={(u.led_groups ?? []).join(", ")}
          placeholder="Células do líder (a, b)"
          className="rounded-xl border border-slate-300 px-2.5 py-2 text-sm bg-white"
        />
        <button className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800">
          Salvar
        </button>
      </form>
    </Card>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Usuários e permissões"
        subtitle="Aprove novos acessos e defina os perfis"
      />

      {pendentes.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-2">
            ⏳ Aguardando aprovação ({pendentes.length})
          </h2>
          <div className="space-y-3">
            {pendentes.map((u) => (
              <UserRow key={u.id} u={u} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Usuários do app
        </h2>
        {outros.length === 0 ? (
          <EmptyState emoji="👤" text="Nenhum usuário cadastrado ainda." />
        ) : (
          <div className="space-y-3">
            {outros.map((u) => (
              <UserRow key={u.id} u={u} />
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Perfis: <strong>Coordenador</strong> tem acesso total · <strong>Tesoureiro</strong> gerencia
        finanças e PIX · <strong>Líder</strong> registra frequência e publica avisos ·{" "}
        <strong>Membro</strong> vê agenda, mural e contribui via PIX.
      </p>
    </div>
  );
}
