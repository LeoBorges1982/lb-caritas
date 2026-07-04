import { NextResponse } from "next/server";
import { getSessionUser, canManageFinance } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import { TIPOS_CONTRIBUICAO } from "@/lib/utils";

// Exportação CSV dos recebimentos PIX
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.status !== "ativo" || !canManageFinance(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const db = adminClient();
  const { data } = await db
    .from("rcc_pix_payments")
    .select("*, rcc_members(full_name)")
    .order("created_at", { ascending: false });

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [["criado_em", "txid", "tipo", "membro", "status", "pago_em", "valor"].join(";")];
  for (const p of data ?? []) {
    lines.push(
      [
        String(p.created_at).slice(0, 16).replace("T", " "),
        p.txid,
        TIPOS_CONTRIBUICAO[p.contribution_type] ?? p.contribution_type,
        esc(p.anonymous ? "Anônima" : (p.rcc_members as { full_name?: string } | null)?.full_name ?? ""),
        p.status,
        p.paid_at ? String(p.paid_at).slice(0, 16).replace("T", " ") : "",
        String(Number(p.amount).toFixed(2)).replace(".", ","),
      ].join(";")
    );
  }

  return new NextResponse("﻿" + lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="recebimentos-pix.csv"`,
    },
  });
}
