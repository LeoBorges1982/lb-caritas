import { adminClient } from "@/lib/supabase/admin";
import { Field, inputCls, SubmitButton } from "@/components/ui";
import { CATEGORIAS_RECEITA, CATEGORIAS_DESPESA, FORMAS_PAGAMENTO } from "@/lib/utils";

export default async function TransactionForm({
  type,
  action,
}: {
  type: "income" | "expense";
  action: (fd: FormData) => Promise<void>;
}) {
  const db = adminClient();
  const isIncome = type === "income";
  const categorias = isIncome ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: members }, { data: suppliers }] = await Promise.all([
    isIncome
      ? db.from("rcc_members").select("id, full_name").eq("status", "ativo").order("full_name")
      : Promise.resolve({ data: null }),
    !isIncome
      ? db.from("rcc_suppliers").select("id, name").order("name")
      : Promise.resolve({ data: null }),
  ]);

  return (
    <form action={action} className="space-y-4 max-w-xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoria" required>
          <select name="category" required className={inputCls}>
            {Object.entries(categorias).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>

        <Field label="Valor (R$)" required>
          <input
            name="amount"
            required
            inputMode="decimal"
            placeholder="0,00"
            className={inputCls}
          />
        </Field>

        <Field label="Data" required>
          <input type="date" name="date" required defaultValue={today} className={inputCls} />
        </Field>

        <Field label="Forma de pagamento">
          <select name="payment_method" className={inputCls}>
            <option value="">—</option>
            {Object.entries(FORMAS_PAGAMENTO).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>

        {isIncome && members && (
          <Field label="Membro relacionado (dízimo/oferta identificada)">
            <select name="member_id" className={inputCls}>
              <option value="">— Não identificado —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </Field>
        )}

        {!isIncome && suppliers && (
          <Field label="Fornecedor">
            <select name="supplier_id" className={inputCls}>
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Status" required>
          <select name="status" className={inputCls} defaultValue={isIncome ? "confirmado" : "pago"}>
            <option value={isIncome ? "confirmado" : "pago"}>{isIncome ? "Confirmado" : "Pago"}</option>
            <option value="pendente">Pendente</option>
          </select>
        </Field>
      </div>

      <Field label="Descrição">
        <textarea name="description" rows={2} className={inputCls} placeholder={isIncome ? "Ex: Ofertas do grupo de oração" : "Ex: Lanche da partilha"} />
      </Field>

      <p className="text-xs text-slate-500">
        {isIncome
          ? "Receitas pendentes não entram no saldo até serem confirmadas."
          : "Despesas pendentes não reduzem o saldo até serem marcadas como pagas."}
      </p>

      <SubmitButton>{isIncome ? "Registrar receita" : "Registrar despesa"}</SubmitButton>
    </form>
  );
}
