import { redirect } from "next/navigation";
import { getSessionUser, canManageMembers } from "@/lib/session";
import { PageHeader, Card, SubmitButton } from "@/components/ui";
import { importMembersCsv } from "../actions";

export const dynamic = "force-dynamic";

export default async function ImportarMembrosPage() {
  const user = await getSessionUser();
  if (!user || !canManageMembers(user)) redirect("/membros");

  return (
    <div>
      <PageHeader
        title="Importar membros"
        subtitle="Migre sua planilha (CSV) para o app de uma só vez"
      />
      <Card className="max-w-xl space-y-4">
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-sm text-blue-900">
          <p className="font-semibold mb-1">Formato esperado (CSV com ; ou ,):</p>
          <code className="text-xs block overflow-x-auto">
            full_name;phone;birth_date;email;ministry;cell_group;role_in_group;status
          </code>
          <p className="text-xs mt-2">
            Também aceitamos cabeçalhos em português: nome, telefone, data_nascimento, e-mail,
            ministerio, celula, cargo, status. Datas em dd/mm/aaaa ou aaaa-mm-dd. Duplicidades por
            nome, e-mail ou telefone são ignoradas automaticamente.
          </p>
        </div>

        <form action={importMembersCsv} className="space-y-4">
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-blue-700 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-800"
          />
          <SubmitButton>Importar planilha</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
