import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

/**
 * Endpoint chamado por cron job pra disparar alertas automáticos.
 *
 * Segurança: requer header `X-Cron-Secret` igual ao env CRON_SECRET.
 *
 * Cron sugerido (1x por dia, 7h da manhã):
 *   0 7 * * * curl -s -H "X-Cron-Secret: <secret>" https://caritas.leoborgescontador.com.br/api/cron/alertas
 */
export async function POST(req: NextRequest) {
  return processarCron(req);
}
export async function GET(req: NextRequest) {
  return processarCron(req);
}

async function processarCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });
  }
  const provided = req.headers.get("X-Cron-Secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = adminClient();
  const criados: string[] = [];
  const ignorados: string[] = [];

  // Busca convênios ativos
  const { data: convenios, error: convErr } = await supabase
    .from("caritas_convenios")
    .select("id, numero, vigencia_inicio, vigencia_fim, valor_total, status")
    .in("status", ["vigente", "em_analise"]);
  if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 });

  const hojeISO = new Date().toISOString().slice(0, 10);

  for (const c of convenios ?? []) {
    // -----------------------------------------------------------------
    // Regra 1: Vigência vencendo em < 90 dias
    // -----------------------------------------------------------------
    const fim = new Date(c.vigencia_fim);
    const hoje = new Date(hojeISO);
    const diasRestantes = Math.floor((fim.getTime() - hoje.getTime()) / 86_400_000);

    if (diasRestantes >= 0 && diasRestantes <= 90) {
      const r = await criarSeNovo(supabase, c.id, "vigencia_proxima", `vig-${c.id}-${c.vigencia_fim}`, {
        severidade: diasRestantes <= 30 ? "critico" : "aviso",
        titulo: `Vigência do convênio ${c.numero} vence em ${diasRestantes} dias`,
        mensagem: `O convênio ${c.numero} vence em ${new Date(c.vigencia_fim).toLocaleDateString("pt-BR")}. Avaliar prorrogação via aditivo ou planejar encerramento e prestação de contas final.`,
        vencimento: c.vigencia_fim,
      });
      r ? criados.push(`vigencia ${c.numero}`) : ignorados.push(`vigencia ${c.numero}`);
    }

    // -----------------------------------------------------------------
    // Regra 2: Saldo crítico (< 5% do valor total)
    // -----------------------------------------------------------------
    const { data: saldo } = await supabase
      .from("caritas_v_saldo_convenio")
      .select("saldo_atual")
      .eq("convenio_id", c.id)
      .maybeSingle();

    const saldoAtual = Number(saldo?.saldo_atual ?? 0);
    const valorTotal = Number(c.valor_total);
    const pct = valorTotal > 0 ? (saldoAtual / valorTotal) * 100 : 0;
    if (saldoAtual > 0 && pct < 5 && diasRestantes > 60) {
      const r = await criarSeNovo(supabase, c.id, "saldo_critico", `saldo-${c.id}-${hojeISO.slice(0, 7)}`, {
        severidade: "aviso",
        titulo: `Saldo crítico no convênio ${c.numero}`,
        mensagem: `O saldo atual (${saldoAtual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) representa ${pct.toFixed(1)}% do valor total. Avaliar próximos repasses e cronograma de despesas.`,
      });
      r ? criados.push(`saldo ${c.numero}`) : ignorados.push(`saldo ${c.numero}`);
    }

    // -----------------------------------------------------------------
    // Regra 3: Rubrica estourou (> 95% executada)
    // -----------------------------------------------------------------
    const { data: cats } = await supabase
      .from("caritas_categorias_despesa")
      .select("id, codigo, nome, valor_previsto")
      .eq("convenio_id", c.id)
      .gt("valor_previsto", 0);

    for (const cat of cats ?? []) {
      const { data: lancs } = await supabase
        .from("caritas_lancamentos")
        .select("valor, status")
        .eq("convenio_id", c.id)
        .eq("categoria_id", cat.id)
        .eq("tipo", "despesa")
        .neq("status", "cancelado");

      const realizado = (lancs ?? [])
        .filter((l) => l.status !== "glosado")
        .reduce((s, l) => s + Number(l.valor), 0);
      const previsto = Number(cat.valor_previsto);
      const pctCat = previsto > 0 ? (realizado / previsto) * 100 : 0;

      if (pctCat > 95) {
        const r = await criarSeNovo(
          supabase, c.id, "rubrica_limite",
          `rubrica-${cat.id}-${hojeISO.slice(0, 7)}`,
          {
            severidade: pctCat > 100 ? "critico" : "aviso",
            titulo: `Rubrica ${cat.codigo} (${cat.nome}) ${pctCat > 100 ? "estourou previsto" : "no limite"}`,
            mensagem: `Realizado: ${realizado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de ${previsto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} (${pctCat.toFixed(1)}%). ${pctCat > 100 ? "Risco de glosa." : "Avaliar remanejamento."}`,
            metadata: { categoria_id: cat.id, percentual: pctCat },
          }
        );
        r ? criados.push(`rubrica ${cat.codigo} ${c.numero}`) : ignorados.push(`rubrica ${cat.codigo} ${c.numero}`);
      }
    }

    // -----------------------------------------------------------------
    // Regra 4: Prestação mensal atrasada
    // (sem prestação criada com período fim > 15 dias atrás)
    // -----------------------------------------------------------------
    const quinzeDiasAtras = new Date();
    quinzeDiasAtras.setDate(quinzeDiasAtras.getDate() - 15);
    const quinzeISO = quinzeDiasAtras.toISOString().slice(0, 10);

    const { data: prests } = await supabase
      .from("caritas_prestacoes_contas")
      .select("id, periodo_fim, status")
      .eq("convenio_id", c.id)
      .order("periodo_fim", { ascending: false })
      .limit(1);

    const ultimaPrest = prests?.[0];
    const mesPassadoFim = ultimoMesFim();
    const precisaPrestacao = !ultimaPrest || ultimaPrest.periodo_fim < mesPassadoFim;
    if (precisaPrestacao && mesPassadoFim < quinzeISO) {
      const r = await criarSeNovo(supabase, c.id, "prestacao_atrasada", `prest-${c.id}-${mesPassadoFim}`, {
        severidade: "critico",
        titulo: `Prestação mensal atrasada no convênio ${c.numero}`,
        mensagem: `O mês encerrado em ${new Date(mesPassadoFim).toLocaleDateString("pt-BR")} ainda não tem prestação de contas criada. SEMAS Nova Iguaçu exige prestações mensais.`,
        vencimento: mesPassadoFim,
      });
      r ? criados.push(`prestacao ${c.numero}`) : ignorados.push(`prestacao ${c.numero}`);
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    criados: criados.length,
    ignorados: ignorados.length,
    detalhes: { criados, ignorados },
  });
}

/** Cria alerta só se não houver outro com mesma chave aberto. */
async function criarSeNovo(
  supabase: ReturnType<typeof adminClient>,
  convenio_id: string,
  tipo: string,
  chave: string,
  payload: {
    severidade: "info" | "aviso" | "critico";
    titulo: string;
    mensagem: string;
    vencimento?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<boolean> {
  // Verifica se já existe um alerta do mesmo tipo aberto para esse convênio
  // com a chave no metadata
  const { data: existentes } = await supabase
    .from("caritas_alertas")
    .select("id, metadata")
    .eq("convenio_id", convenio_id)
    .eq("tipo", tipo)
    .eq("resolvido", false);

  const jaExiste = (existentes ?? []).some(
    (a) => (a.metadata as { chave?: string } | null)?.chave === chave
  );
  if (jaExiste) return false;

  const { error } = await supabase.from("caritas_alertas").insert({
    convenio_id,
    tipo,
    severidade: payload.severidade,
    titulo: payload.titulo,
    mensagem: payload.mensagem,
    vencimento: payload.vencimento ?? null,
    metadata: { chave, ...(payload.metadata ?? {}) },
  });

  return !error;
}

/** Retorna o último dia do mês encerrado mais recente. */
function ultimoMesFim(): string {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth(); // 0-11 — o mês passado é (mes), porque setDate(0) volta 1 dia
  const dataFim = new Date(ano, mes, 0);
  return dataFim.toISOString().slice(0, 10);
}
