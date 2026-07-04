import { redirect } from "next/navigation";
import { getSessionUser, canManageMembers } from "@/lib/session";
import { PageHeader, Card } from "@/components/ui";
import MemberForm from "@/components/MemberForm";
import { createMember } from "../actions";

export const dynamic = "force-dynamic";

export default async function NovoMembroPage() {
  const user = await getSessionUser();
  if (!user || !canManageMembers(user)) redirect("/membros");

  return (
    <div>
      <PageHeader title="Novo membro" subtitle="Cadastro de pessoa no grupo" />
      <Card>
        <MemberForm action={createMember} />
      </Card>
    </div>
  );
}
