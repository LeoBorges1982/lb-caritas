import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { PageHeader, Card, Field, inputCls, SubmitButton } from "@/components/ui";
import { CATEGORIAS_ORACAO } from "@/lib/utils";
import { createPrayerRequest } from "../actions";

export const dynamic = "force-dynamic";

export default async function NovoPedidoPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div>
      <PageHeader title="Novo pedido de oração" subtitle="“Orai uns pelos outros” — Tg 5,16" />
      <Card className="max-w-xl">
        <form action={createPrayerRequest} className="space-y-4">
          <Field label="Título do pedido" required>
            <input name="title" required className={inputCls} placeholder="Ex: Pela saúde da minha mãe" />
          </Field>

          <Field label="Descrição (opcional)">
            <textarea name="description" rows={3} className={inputCls} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoria" required>
              <select name="category" className={inputCls} defaultValue="outro">
                {Object.entries(CATEGORIAS_ORACAO).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Visibilidade" required>
              <select name="visibility" className={inputCls} defaultValue="publico">
                <option value="publico">Público (mural do grupo)</option>
                <option value="privado">Privado (só a intercessão vê)</option>
              </select>
            </Field>
          </div>

          <SubmitButton>Enviar pedido</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
