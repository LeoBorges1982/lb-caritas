import { redirect } from "next/navigation";
import { getSessionUser, canManageFinance } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import { formatBRL } from "@/lib/utils";
import { PageHeader, Card, EmptyState, Field, inputCls, SubmitButton } from "@/components/ui";
import { createSupplier } from "../actions";

export const dynamic = "force-dynamic";

export default async function FornecedoresPage() {
  const user = await getSessionUser();
  if (!user || !canManageFinance(user)) redirect("/dashboard");

  const db = adminClient();
  const [{ data: suppliers }, { data: expenses }] = await Promise.all([
    db.from("rcc_suppliers").select("*").order("name"),
    db.from("rcc_financial_transactions").select("supplier_id, amount").eq("type", "expense").eq("status", "pago"),
  ]);

  const totals = new Map<string, number>();
  for (const e of expenses ?? []) {
    if (e.supplier_id) totals.set(e.supplier_id, (totals.get(e.supplier_id) ?? 0) + Number(e.amount));
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Fornecedores" subtitle="Cadastro simples para vincular às despesas" />

      {!suppliers || suppliers.length === 0 ? (
        <EmptyState emoji="🚚" text="Nenhum fornecedor cadastrado ainda." />
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {suppliers.map((s) => (
              <li key={s.id} className="p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {[s.document, s.phone, s.description].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-700 shrink-0">
                  {formatBRL(totals.get(s.id) ?? 0)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="font-semibold text-slate-800 mb-4">Novo fornecedor</h2>
        <form action={createSupplier} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" required>
            <input name="name" required className={inputCls} />
          </Field>
          <Field label="CNPJ ou CPF (opcional)">
            <input name="document" className={inputCls} />
          </Field>
          <Field label="Telefone">
            <input name="phone" className={inputCls} />
          </Field>
          <Field label="E-mail">
            <input type="email" name="email" className={inputCls} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Descrição">
              <input name="description" className={inputCls} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <SubmitButton>Salvar fornecedor</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
