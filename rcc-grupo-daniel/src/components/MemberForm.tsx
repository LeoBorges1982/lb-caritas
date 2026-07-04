import { Field, inputCls, SubmitButton } from "@/components/ui";
import { STATUS_MEMBRO } from "@/lib/utils";

type Member = Record<string, string | boolean | null>;

export default function MemberForm({
  action,
  member,
}: {
  action: (fd: FormData) => Promise<void>;
  member?: Member;
}) {
  const v = (k: string) => (member?.[k] as string) ?? "";

  return (
    <form action={action} className="space-y-4 max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Nome completo" required>
            <input name="full_name" required defaultValue={v("full_name")} className={inputCls} />
          </Field>
        </div>

        <Field label="Data de nascimento">
          <input type="date" name="birth_date" defaultValue={v("birth_date")} className={inputCls} />
        </Field>
        <Field label="Sexo">
          <select name="gender" defaultValue={v("gender")} className={inputCls}>
            <option value="">—</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
          </select>
        </Field>

        <Field label="Telefone">
          <input name="phone" defaultValue={v("phone")} className={inputCls} placeholder="(21) 90000-0000" />
        </Field>
        <Field label="WhatsApp">
          <input name="whatsapp" defaultValue={v("whatsapp")} className={inputCls} />
        </Field>

        <Field label="E-mail">
          <input type="email" name="email" defaultValue={v("email")} className={inputCls} />
        </Field>
        <Field label="Estado civil">
          <select name="marital_status" defaultValue={v("marital_status")} className={inputCls}>
            <option value="">—</option>
            <option value="solteiro">Solteiro(a)</option>
            <option value="casado">Casado(a)</option>
            <option value="viuvo">Viúvo(a)</option>
            <option value="divorciado">Divorciado(a)</option>
            <option value="uniao_estavel">União estável</option>
            <option value="outro">Outro</option>
          </select>
        </Field>

        <div className="sm:col-span-2">
          <Field label="Endereço">
            <input name="address" defaultValue={v("address")} className={inputCls} />
          </Field>
        </div>

        <Field label="Ministério">
          <input name="ministry" defaultValue={v("ministry")} className={inputCls} placeholder="Intercessão, Música..." />
        </Field>
        <Field label="Célula / pequeno grupo">
          <input name="cell_group" defaultValue={v("cell_group")} className={inputCls} placeholder="Célula Emaús..." />
        </Field>

        <Field label="Cargo / função no grupo">
          <input name="role_in_group" defaultValue={v("role_in_group")} className={inputCls} placeholder="Servo, Líder..." />
        </Field>
        <Field label="Data de entrada no grupo">
          <input type="date" name="joined_at" defaultValue={v("joined_at")} className={inputCls} />
        </Field>

        <Field label="Status" required>
          <select name="status" defaultValue={v("status") || "ativo"} className={inputCls}>
            {Object.entries(STATUS_MEMBRO).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Observações pastorais">
        <textarea name="notes" defaultValue={v("notes")} rows={3} className={inputCls} />
      </Field>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          name="accepted_terms"
          defaultChecked={Boolean(member?.accepted_terms)}
          className="h-4 w-4"
        />
        Membro aceitou os termos de uso e a política de privacidade (LGPD)
      </label>

      <SubmitButton>Salvar membro</SubmitButton>
    </form>
  );
}
