import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, canManageFinance } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import { formatBRL, formatDate, TIPOS_CONTRIBUICAO } from "@/lib/utils";
import { PageHeader, Card, Badge, EmptyState, PrimaryLink } from "@/components/ui";
import { QrCode, Download } from "lucide-react";
import { confirmPixManual, cancelPixCharge } from "./actions";

export const dynamic = "force-dynamic";

export default async function PixPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const db = adminClient();
  const isTreasurer = canManageFinance(user);

  let query = db
    .from("rcc_pix_payments")
    .select("*, rcc_members(full_name)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (!isTreasurer) {
    // membro vê apenas suas próprias contribuições identificadas
    if (user.member_id) query = query.eq("member_id", user.member_id);
    else query = query.eq("member_id", "00000000-0000-0000-0000-000000000000");
  }
  const { data: payments } = await query;

  return (
    <div>
      <PageHeader
        title={isTreasurer ? "Recebimentos PIX" : "Minhas contribuições"}
        subtitle={
          isTreasurer
            ? "Gestão das doações recebidas via PIX"
            : "Histórico das suas contribuições via PIX"
        }
        action={
          <div className="flex gap-2">
            {isTreasurer && (
              <a
                href="/api/relatorios/pix-csv"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" /> CSV
              </a>
            )}
            <PrimaryLink href="/pix/contribuir">
              <QrCode className="h-4 w-4" /> Contribuir
            </PrimaryLink>
          </div>
        }
      />

      {!payments || payments.length === 0 ? (
        <EmptyState
          emoji="💚"
          text={
            isTreasurer
              ? "Nenhum recebimento PIX registrado ainda."
              : "Você ainda não fez contribuições pelo app. Que tal começar hoje?"
          }
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {payments.map((p) => (
              <li key={p.id} className="p-3.5 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    {TIPOS_CONTRIBUICAO[p.contribution_type]} · {formatBRL(Number(p.amount))}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {formatDate(p.created_at, "dd/MM/yyyy HH:mm")}
                    {isTreasurer &&
                      ` · ${p.anonymous ? "Anônima" : (p.rcc_members as { full_name?: string } | null)?.full_name ?? "Não identificada"}`}
                  </p>
                </div>
                <div className="shrink-0 text-right space-y-1">
                  <Badge
                    value={p.status}
                    label={
                      p.status === "aguardando"
                        ? "Aguardando"
                        : p.status.charAt(0).toUpperCase() + p.status.slice(1)
                    }
                  />
                  {p.status === "aguardando" && (
                    <div className="flex gap-2 justify-end">
                      <Link href={`/pix/cobranca/${p.txid}`} className="text-xs font-semibold text-blue-700 hover:underline">
                        Ver QR
                      </Link>
                      {isTreasurer && (
                        <>
                          <form action={confirmPixManual.bind(null, p.txid)}>
                            <button className="text-xs font-semibold text-emerald-700 hover:underline">
                              Dar baixa
                            </button>
                          </form>
                          <form action={cancelPixCharge.bind(null, p.txid)}>
                            <button className="text-xs font-semibold text-slate-500 hover:underline">
                              Cancelar
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
