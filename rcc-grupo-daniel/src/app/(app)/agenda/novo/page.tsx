import { redirect } from "next/navigation";
import { getSessionUser, canPublish } from "@/lib/session";
import { PageHeader, Card, Field, inputCls, SubmitButton } from "@/components/ui";
import { TIPOS_EVENTO } from "@/lib/utils";
import { createEvent } from "../actions";

export const dynamic = "force-dynamic";

export default async function NovoEventoPage() {
  const user = await getSessionUser();
  if (!user || !canPublish(user)) redirect("/agenda");

  return (
    <div>
      <PageHeader title="Novo evento" subtitle="Aparecerá na agenda e no início do app" />
      <Card className="max-w-xl">
        <form action={createEvent} className="space-y-4">
          <Field label="Nome do evento" required>
            <input name="title" required className={inputCls} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo" required>
              <select name="type" className={inputCls} defaultValue="grupo_oracao">
                {Object.entries(TIPOS_EVENTO).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Data" required>
              <input type="date" name="date" required className={inputCls} />
            </Field>
            <Field label="Início">
              <input type="time" name="start_time" className={inputCls} />
            </Field>
            <Field label="Término">
              <input type="time" name="end_time" className={inputCls} />
            </Field>
          </div>

          <Field label="Local">
            <input name="location" className={inputCls} />
          </Field>
          <Field label="Descrição">
            <textarea name="description" rows={3} className={inputCls} />
          </Field>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="notify_members" defaultChecked className="h-4 w-4" />
            Notificar membros (aviso interno no app)
          </label>

          <SubmitButton>Salvar evento</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
