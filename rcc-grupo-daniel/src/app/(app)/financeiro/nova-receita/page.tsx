import { redirect } from "next/navigation";
import { getSessionUser, canManageFinance } from "@/lib/session";
import { PageHeader, Card } from "@/components/ui";
import TransactionForm from "@/components/TransactionForm";
import { createTransaction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NovaReceitaPage() {
  const user = await getSessionUser();
  if (!user || !canManageFinance(user)) redirect("/dashboard");

  return (
    <div>
      <PageHeader title="Nova contribuição" subtitle="Registrar entrada em caixa" />
      <Card>
        <TransactionForm type="income" action={createTransaction.bind(null, "income")} />
      </Card>
    </div>
  );
}
