import { redirect } from "next/navigation";
import { getSessionUser, canPublish } from "@/lib/session";
import { PageHeader, Card, Field, inputCls, SubmitButton } from "@/components/ui";
import { TIPOS_AVISO } from "@/lib/utils";
import { createAnnouncement } from "../actions";

export const dynamic = "force-dynamic";

export default async function NovoAvisoPage() {
  const user = await getSessionUser();
  if (!user || !canPublish(user)) redirect("/avisos");

  return (
    <div>
      <PageHeader title="Novo aviso" subtitle="Publicação no mural do grupo" />
      <Card className="max-w-xl">
        <form action={createAnnouncement} className="space-y-4">
          <Field label="Título" required>
            <input name="title" required className={inputCls} />
          </Field>

          <Field label="Conteúdo" required>
            <textarea name="content" required rows={4} className={inputCls} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo" required>
              <select name="type" className={inputCls} defaultValue="comunicado">
                {Object.entries(TIPOS_AVISO).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Público" required>
              <select name="target_audience" className={inputCls} defaultValue="todos">
                <option value="todos">Todos</option>
                <option value="membros">Membros</option>
                <option value="lideres">Líderes</option>
                <option value="tesouraria">Tesouraria</option>
                <option value="coordenacao">Coordenação</option>
              </select>
            </Field>
            <Field label="Publicar em (opcional)">
              <input type="datetime-local" name="publish_at" className={inputCls} />
            </Field>
            <Field label="Expira em (opcional)">
              <input type="datetime-local" name="expires_at" className={inputCls} />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="is_pinned" className="h-4 w-4" />
            Fixar aviso no topo do mural
          </label>

          <SubmitButton>Publicar aviso</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
