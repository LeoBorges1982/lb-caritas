import { notFound, redirect } from "next/navigation";
import { getSessionUser, canManageMembers } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import { PageHeader, Card } from "@/components/ui";
import MemberForm from "@/components/MemberForm";
import { updateMember } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditarMembroPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !canManageMembers(user)) redirect("/membros");

  const { id } = await params;
  const db = adminClient();
  const { data: member } = await db.from("rcc_members").select("*").eq("id", id).single();
  if (!member) notFound();

  return (
    <div>
      <PageHeader title="Editar membro" subtitle={member.full_name} />
      <Card>
        <MemberForm action={updateMember.bind(null, id)} member={member} />
      </Card>
    </div>
  );
}
