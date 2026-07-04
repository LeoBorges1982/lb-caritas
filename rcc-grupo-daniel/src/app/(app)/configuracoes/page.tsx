import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import { PageHeader, Card, Field, inputCls, SubmitButton } from "@/components/ui";
import { updateSettings } from "./actions";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) redirect("/dashboard");

  const db = adminClient();
  const { data: s } = await db.from("rcc_settings").select("*").eq("id", 1).single();

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Dados do grupo e recebimento PIX" />

      <Card className="max-w-xl">
        <form action={updateSettings} className="space-y-4">
          <Field label="Nome do grupo" required>
            <input name="group_name" required defaultValue={s?.group_name ?? "RCC Grupo Daniel"} className={inputCls} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Dia/horário dos encontros">
              <input name="meeting_weekday" defaultValue={s?.meeting_weekday ?? ""} className={inputCls} placeholder="Toda quinta, 19h30" />
            </Field>
            <Field label="Local dos encontros">
              <input name="meeting_place" defaultValue={s?.meeting_place ?? ""} className={inputCls} />
            </Field>
          </div>

          <hr className="border-slate-100" />
          <h2 className="font-semibold text-slate-800">Recebimento PIX</h2>
          <p className="text-xs text-slate-500 -mt-2">
            A chave abaixo é usada para gerar o QR Code e o copia-e-cola das contribuições.
          </p>

          <Field label="Chave PIX do grupo" required>
            <input name="pix_key" defaultValue={s?.pix_key ?? ""} className={inputCls} placeholder="e-mail, telefone, CNPJ ou chave aleatória" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do recebedor (máx. 25)">
              <input name="pix_merchant_name" maxLength={25} defaultValue={s?.pix_merchant_name ?? "RCC GRUPO DANIEL"} className={inputCls} />
            </Field>
            <Field label="Cidade do recebedor (máx. 15)">
              <input name="pix_merchant_city" maxLength={15} defaultValue={s?.pix_merchant_city ?? "NOVA IGUACU"} className={inputCls} />
            </Field>
          </div>

          <hr className="border-slate-100" />

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="moderate_prayers" defaultChecked={s?.moderate_prayers ?? true} className="h-4 w-4" />
            Moderar pedidos de oração públicos antes de publicar
          </label>

          <SubmitButton>Salvar configurações</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
