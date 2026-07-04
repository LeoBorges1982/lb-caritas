import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { getSessionUser, canManageFinance } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import { formatBRL, formatDate, TIPOS_CONTRIBUICAO } from "@/lib/utils";
import { PageHeader, Card, Badge } from "@/components/ui";
import CopyButton from "@/components/CopyButton";
import { confirmPixManual } from "../../actions";

export const dynamic = "force-dynamic";

export default async function CobrancaPixPage({ params }: { params: Promise<{ txid: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { txid } = await params;
  const db = adminClient();
  const { data: p } = await db
    .from("rcc_pix_payments")
    .select("*")
    .eq("txid", txid)
    .single();
  if (!p) notFound();

  const expired =
    p.status === "aguardando" && p.expires_at && new Date(p.expires_at) < new Date();
  const status = expired ? "expirado" : p.status;
  const qr = p.pix_copy_paste
    ? await QRCode.toDataURL(p.pix_copy_paste, { margin: 1, width: 280 })
    : null;

  return (
    <div>
      <PageHeader
        title="Pagamento PIX"
        subtitle={`${TIPOS_CONTRIBUICAO[p.contribution_type]} · ${formatBRL(Number(p.amount))}`}
      />

      <Card className="max-w-md mx-auto text-center space-y-4">
        <div>
          <Badge
            value={status}
            label={
              status === "aguardando"
                ? "Aguardando pagamento"
                : status === "confirmado"
                ? "Pagamento confirmado 🎉"
                : status === "expirado"
                ? "Cobrança expirada"
                : "Cancelada"
            }
          />
        </div>

        {status === "confirmado" ? (
          <div className="space-y-2">
            <p className="text-5xl">🙌</p>
            <p className="text-sm text-slate-600">
              Recebemos sua contribuição em {formatDate(p.paid_at, "dd/MM/yyyy 'às' HH:mm")}. Deus
              abençoe sua generosidade!
            </p>
          </div>
        ) : status === "aguardando" ? (
          <>
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR Code PIX" className="mx-auto rounded-2xl border border-slate-200" />
            )}

            <div className="text-left space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase">PIX copia e cola</p>
              <p className="rounded-xl bg-slate-50 border border-slate-200 p-3 font-mono text-[11px] break-all text-slate-600">
                {p.pix_copy_paste}
              </p>
              <CopyButton text={p.pix_copy_paste ?? ""} />
            </div>

            <ol className="text-left text-sm text-slate-600 space-y-1.5 rounded-xl bg-blue-50 border border-blue-100 p-4">
              <li>1. Abra o app do seu banco.</li>
              <li>2. Escolha pagar com <strong>PIX</strong> (QR Code ou copia-e-cola).</li>
              <li>3. Confira o valor e confirme o pagamento.</li>
              <li>4. A tesouraria confirmará o recebimento no app.</li>
            </ol>

            <Link
              href={`/pix/cobranca/${txid}`}
              className="block text-sm font-semibold text-blue-700 hover:underline"
            >
              Atualizar status
            </Link>

            {canManageFinance(user) && (
              <form action={confirmPixManual.bind(null, txid)}>
                <button className="w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
                  ✓ Confirmar recebimento (baixa manual)
                </button>
              </form>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500">
            Esta cobrança não está mais ativa. Gere uma nova contribuição se desejar.
          </p>
        )}

        <Link href="/pix" className="block text-sm text-blue-700 hover:underline">
          Voltar
        </Link>
      </Card>
    </div>
  );
}
