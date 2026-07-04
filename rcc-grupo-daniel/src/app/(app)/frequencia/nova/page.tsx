import { redirect } from "next/navigation";
import { getSessionUser, canManageAttendance } from "@/lib/session";
import { PageHeader, Card, Field, inputCls, SubmitButton } from "@/components/ui";
import { TIPOS_EVENTO } from "@/lib/utils";
import { createMeeting } from "../actions";

export const dynamic = "force-dynamic";

export default async function NovaReuniaoPage() {
  const user = await getSessionUser();
  if (!user || !canManageAttendance(user)) redirect("/dashboard");

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="Nova reunião" subtitle="Depois registre a presença dos membros" />
      <Card className="max-w-xl">
        <form action={createMeeting} className="space-y-4">
          <Field label="Título" required>
            <input name="title" required defaultValue="Grupo de Oração" className={inputCls} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo" required>
              <select name="type" className={inputCls} defaultValue="grupo_oracao">
                {Object.entries(TIPOS_EVENTO).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Célula/Ministério (opcional)">
              <input
                name="cell_group"
                className={inputCls}
                placeholder="Deixe vazio p/ encontro geral"
                defaultValue={user.role === "lider" ? user.led_groups[0] ?? "" : ""}
              />
            </Field>
            <Field label="Data" required>
              <input type="date" name="date" required defaultValue={today} className={inputCls} />
            </Field>
            <Field label="Horário">
              <input type="time" name="time" className={inputCls} />
            </Field>
          </div>

          <Field label="Local">
            <input name="location" className={inputCls} placeholder="Salão Paroquial" />
          </Field>
          <Field label="Observações">
            <textarea name="notes" rows={2} className={inputCls} />
          </Field>

          <SubmitButton>Criar e registrar presença</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
