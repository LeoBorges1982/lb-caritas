import { adminClient } from "@/lib/supabase/admin";

// -- Regra de negócio: saldo = receitas confirmadas − despesas pagas ----------
export type FinanceSummary = {
  saldo: number;
  receitasMes: number;
  despesasMes: number;
  doacoesPixMes: number;
  pendencias: number; // lançamentos pendentes (receita ou despesa)
};

export async function getFinanceSummary(): Promise<FinanceSummary> {
  const db = adminClient();
  const { data } = await db
    .from("rcc_financial_transactions")
    .select("type, amount, status, payment_method, date");

  const rows = data ?? [];
  const monthStart = new Date();
  monthStart.setDate(1);
  const ym = monthStart.toISOString().slice(0, 7);

  let saldo = 0,
    receitasMes = 0,
    despesasMes = 0,
    doacoesPixMes = 0,
    pendencias = 0;

  for (const r of rows) {
    const amount = Number(r.amount);
    const inMonth = String(r.date).slice(0, 7) === ym;
    if (r.status === "pendente") pendencias++;
    if (r.type === "income" && r.status === "confirmado") {
      saldo += amount;
      if (inMonth) {
        receitasMes += amount;
        if (r.payment_method === "pix") doacoesPixMes += amount;
      }
    }
    if (r.type === "expense" && r.status === "pago") {
      saldo -= amount;
      if (inMonth) despesasMes += amount;
    }
  }

  return { saldo, receitasMes, despesasMes, doacoesPixMes, pendencias };
}

export async function getMembersSummary() {
  const db = adminClient();
  const { data } = await db.from("rcc_members").select("id, full_name, birth_date, status");
  const rows = data ?? [];
  const month = new Date().getMonth() + 1;
  return {
    total: rows.length,
    ativos: rows.filter((m) => m.status === "ativo").length,
    aniversariantes: rows
      .filter((m) => m.birth_date && Number(String(m.birth_date).slice(5, 7)) === month)
      .sort((a, b) => String(a.birth_date).slice(8) < String(b.birth_date).slice(8) ? -1 : 1),
  };
}

export async function getUpcomingEvents(limit = 5) {
  const db = adminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("rcc_events")
    .select("*")
    .gte("date", today)
    .order("date")
    .limit(limit);
  return data ?? [];
}

export async function getRecentAnnouncements(limit = 5) {
  const db = adminClient();
  const now = new Date().toISOString();
  const { data } = await db
    .from("rcc_announcements")
    .select("*")
    .lte("publish_at", now)
    .or(`expires_at.is.null,expires_at.gte.${now}`)
    .order("is_pinned", { ascending: false })
    .order("publish_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

// Frequência média (%) das últimas N reuniões
export async function getAttendanceRate(lastN = 5): Promise<number | null> {
  const db = adminClient();
  const { data: meetings } = await db
    .from("rcc_attendance_meetings")
    .select("id")
    .order("date", { ascending: false })
    .limit(lastN);
  if (!meetings || meetings.length === 0) return null;

  const ids = meetings.map((m) => m.id);
  const { data: records } = await db
    .from("rcc_attendance_records")
    .select("status, meeting_id")
    .in("meeting_id", ids);
  if (!records || records.length === 0) return null;

  const present = records.filter((r) => r.status === "present").length;
  return Math.round((present / records.length) * 100);
}
