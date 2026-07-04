import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { PageHeader, Card, Field, inputCls, SubmitButton } from "@/components/ui";
import { TIPOS_CONTRIBUICAO } from "@/lib/utils";
import { createPixCharge } from "../actions";

export const dynamic = "force-dynamic";

export default async function ContribuirPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div>
      <PageHeader
        title="Nova contribuição"
        subtitle="Dízimos, ofertas e doações via PIX"
      />

      <Card className="max-w-md">
        <form action={createPixCharge} className="space-y-4">
          <Field label="Tipo de contribuição" required>
            <select name="contribution_type" className={inputCls} defaultValue="oferta">
              {Object.entries(TIPOS_CONTRIBUICAO).map(([v, l]) => (
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
              className={inputCls + " text-2xl font-bold text-center"}
            />
          </Field>

          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input type="checkbox" name="anonymous" className="mt-1 h-4 w-4" />
            <span>
              Contribuição <strong>anônima</strong> (seu nome não ficará vinculado ao registro)
            </span>
          </label>

          <SubmitButton>Gerar PIX</SubmitButton>

          <p className="text-xs text-slate-500">
            Na próxima tela você verá o QR Code e o código copia-e-cola para pagar no app do seu
            banco. “Cada um dê conforme decidiu em seu coração” — 2Cor 9,7.
          </p>
        </form>
      </Card>
    </div>
  );
}
