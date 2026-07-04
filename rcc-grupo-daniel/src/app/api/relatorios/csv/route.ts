import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, canManageFinance } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import { CATEGORIAS_RECEITA, CATEGORIAS_DESPESA } from "@/lib/utils";

// Exportação CSV das movimentações financeiras (prestação de contas)
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.status !== "ativo" || !canManageFinance(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const de = req.nextUrl.searchParams.get("de") ?? "2000-01-01";
  const ate = req.nextUrl.searchParams.get("ate") ?? "2999-12-31";

  const db = adminClient();
  const { data } = await db
    .from("rcc_financial_transactions")
    .select("*, rcc_members(full_name), rcc_suppliers(name)")
    .gte("date", de)
    .lte("date", ate)
    .order("date");

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    ["data", "tipo", "categoria", "descricao", "membro_fornecedor", "forma_pagamento", "status", "valor"].join(";"),
  ];
  for (const r of data ?? []) {
    const cat = (r.type === "income" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA)[r.category] ?? r.category;
    const who =
      (r.rcc_members as { full_name?: string } | null)?.full_name ??
      (r.rcc_suppliers as { name?: string } | null)?.name ??
      "";
    lines.push(
      [
        r.date,
        r.type === "income" ? "Receita" : "Despesa",
        esc(cat),
        esc(r.description),
        esc(who),
        r.payment_method ?? "",
        r.status,
        String(Number(r.amount).toFixed(2)).replace(".", ","),
      ].join(";")
    );
  }

  return new NextResponse("﻿" + lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="prestacao-contas-${de}-a-${ate}.csv"`,
    },
  });
}
