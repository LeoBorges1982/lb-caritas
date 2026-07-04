import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import { ROLES } from "@/lib/utils";
import { PageHeader, Card, Field, inputCls, SubmitButton, Badge } from "@/components/ui";
import { IdCard } from "lucide-react";
import { updateOwnProfile } from "./actions";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const db = adminClient();
  const { data: member } = user.member_id
    ? await db.from("rcc_members").select("*").eq("id", user.member_id).single()
    : { data: null };

  return (
    <div className="space-y-4">
      <PageHeader title="Meu perfil" subtitle={user.email} />

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-slate-800">{user.name}</p>
            <p className="text-sm text-slate-500">{ROLES[user.role]}</p>
          </div>
          <Badge value={user.status} />
        </div>

        {user.member_id ? (
          <Link
            href="/perfil/cartao"
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
          >
            <IdCard className="h-4 w-4" /> Ver meu cartão de membro
          </Link>
        ) : (
          <p className="text-sm text-slate-500">
            Sua conta ainda não está vinculada a uma ficha de membro. Fale com a coordenação.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-800 mb-4">Meus dados</h2>
        <form action={updateOwnProfile} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" required>
            <input name="name" required defaultValue={user.name} className={inputCls} />
          </Field>
          <Field label="Telefone">
            <input name="phone" defaultValue={member?.phone ?? ""} className={inputCls} />
          </Field>
          <Field label="WhatsApp">
            <input name="whatsapp" defaultValue={member?.whatsapp ?? ""} className={inputCls} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Endereço">
              <input name="address" defaultValue={member?.address ?? ""} className={inputCls} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <SubmitButton>Salvar alterações</SubmitButton>
          </div>
        </form>
        <p className="text-xs text-slate-400 mt-3">
          Dados como ministério, célula e status são atualizados pela coordenação.
        </p>
      </Card>
    </div>
  );
}
