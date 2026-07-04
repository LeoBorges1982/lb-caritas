import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import MemberCard from "@/components/MemberCard";

export const dynamic = "force-dynamic";

export default async function MeuCartaoPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.member_id) redirect("/perfil");

  const db = adminClient();
  const { data: member } = await db
    .from("rcc_members")
    .select("*")
    .eq("id", user.member_id)
    .single();
  if (!member) redirect("/perfil");

  return (
    <div>
      <PageHeader title="Meu cartão de membro" subtitle="Apresente na entrada dos encontros" />
      <MemberCard member={member} />
      <p className="text-center text-xs text-slate-400 mt-4">
        Dica: faça uma captura de tela para salvar o cartão no celular.
      </p>
    </div>
  );
}
