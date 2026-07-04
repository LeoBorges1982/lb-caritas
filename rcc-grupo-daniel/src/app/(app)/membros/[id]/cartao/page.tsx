import { notFound, redirect } from "next/navigation";
import { getSessionUser, canViewMembers } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import MemberCard from "@/components/MemberCard";

export const dynamic = "force-dynamic";

export default async function CartaoMembroPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  const { id } = await params;
  // membro comum só vê o próprio cartão
  if (!user || (!canViewMembers(user) && user.member_id !== id)) redirect("/dashboard");

  const db = adminClient();
  const { data: member } = await db.from("rcc_members").select("*").eq("id", id).single();
  if (!member) notFound();

  return (
    <div>
      <PageHeader title="Cartão de membro" subtitle="Apresente na entrada dos encontros" />
      <MemberCard member={member} />
      <p className="text-center text-xs text-slate-400 mt-4">
        Dica: faça uma captura de tela para salvar o cartão no celular.
      </p>
    </div>
  );
}
