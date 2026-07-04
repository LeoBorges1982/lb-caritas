import { redirect } from "next/navigation";
import { getSessionUser, canManageFinance } from "@/lib/session";
import { PageHeader, Card } from "@/components/ui";
import TransactionForm from "@/components/TransactionForm";
import { createTransaction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NovaDespesaPage() {
  const user = await getSessionUser();
  if (!user || !canManageFinance(user)) redirect("/dashboard");

  return (
    <div>
      <PageHeader title="Registrar despesa" subtitle="Saída de caixa" />
      <Card>
        <TransactionForm type="expense" action={createTransaction.bind(null, "expense")} />
      </Card>
    </div>
  );
}
