// ============================================================================
// Parsers de extrato bancário (OFX 1.0 SGML + CSV genérico)
// ============================================================================

export interface TransacaoExtrato {
  /** ID único do banco (FITID em OFX, hash em CSV) */
  fitid: string;
  /** Data postagem ISO YYYY-MM-DD */
  data: string;
  /** Sempre positivo */
  valor: number;
  /** "C" entrada, "D" saída */
  tipo: "C" | "D";
  /** Descrição do extrato */
  memo: string;
}

// ----------------------------------------------------------------------------
// OFX 1.0 (SGML, formato exportado pela Caixa e maioria dos bancos BR)
// ----------------------------------------------------------------------------
export function parseOFX(texto: string): TransacaoExtrato[] {
  const transacoes: TransacaoExtrato[] = [];

  // Captura blocos <STMTTRN>...</STMTTRN>
  const regexTrn = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  const matches = texto.matchAll(regexTrn);

  for (const m of matches) {
    const bloco = m[1];

    const trntype = extrairTag(bloco, "TRNTYPE");  // CREDIT|DEBIT|...
    const dtposted = extrairTag(bloco, "DTPOSTED"); // ex: 20250401120000[-03:BRT]
    const trnamt = extrairTag(bloco, "TRNAMT");     // ex: -1617.69
    const fitid = extrairTag(bloco, "FITID");
    const memo = extrairTag(bloco, "MEMO") || extrairTag(bloco, "NAME") || "";

    if (!dtposted || !trnamt) continue;

    const data = parseDataOFX(dtposted);
    const valorRaw = parseFloat(trnamt.replace(",", "."));
    if (!Number.isFinite(valorRaw)) continue;

    const tipo: "C" | "D" = valorRaw >= 0 ? "C" : "D";
    const valor = Math.abs(valorRaw);

    transacoes.push({
      fitid: fitid || `${data}-${valorRaw.toFixed(2)}-${memo.slice(0, 20)}`,
      data,
      valor,
      tipo: trntype === "CREDIT" || trntype === "DEP" ? "C" : trntype === "DEBIT" || trntype === "XFER" ? tipo : tipo,
      memo: memo.trim(),
    });
  }

  return transacoes;
}

function extrairTag(bloco: string, tag: string): string | null {
  // OFX 1.0 SGML — tags podem ou não ter fechamento
  const r1 = new RegExp(`<${tag}>([^<\\n\\r]+)`, "i");
  const m = bloco.match(r1);
  return m ? m[1].trim() : null;
}

function parseDataOFX(s: string): string {
  // Aceita 20250401, 20250401120000, 20250401120000[-03:BRT]
  const ano = s.slice(0, 4);
  const mes = s.slice(4, 6);
  const dia = s.slice(6, 8);
  return `${ano}-${mes}-${dia}`;
}

// ----------------------------------------------------------------------------
// CSV genérico (Caixa, Itaú, BB, Sicoob, etc.)
// ----------------------------------------------------------------------------
export function parseCSV(texto: string): TransacaoExtrato[] {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim());
  if (linhas.length < 2) return [];

  // Detecta separador
  const sep = (linhas[0].match(/;/g)?.length ?? 0) > (linhas[0].match(/,/g)?.length ?? 0) ? ";" : ",";

  // Tenta detectar linha de header
  let headerIdx = -1;
  for (let i = 0; i < Math.min(linhas.length, 10); i++) {
    const l = linhas[i].toLowerCase();
    if ((l.includes("data") || l.includes("dt")) && (l.includes("valor") || l.includes("vlr"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) headerIdx = 0;

  const header = linhas[headerIdx].split(sep).map((c) => c.trim().toLowerCase().replace(/^["']|["']$/g, ""));
  const idxData = header.findIndex((h) => /^d(ata|t)/.test(h));
  const idxValor = header.findIndex((h) => /val(or)?|vlr/.test(h));
  const idxDesc = header.findIndex((h) => /hist[oó]rico|descr|lan[çc]/.test(h));
  const idxTipo = header.findIndex((h) => /^tipo$|cr[ée]d|d[ée]b/.test(h));

  if (idxData === -1 || idxValor === -1) return [];

  const transacoes: TransacaoExtrato[] = [];

  for (let i = headerIdx + 1; i < linhas.length; i++) {
    const cells = parsarLinhaCSV(linhas[i], sep);
    if (cells.length < 2) continue;

    const dataRaw = cells[idxData]?.trim();
    const valorRaw = cells[idxValor]?.trim();
    const memo = idxDesc >= 0 ? (cells[idxDesc]?.trim() ?? "") : "";
    const tipoExtra = idxTipo >= 0 ? (cells[idxTipo]?.trim().toUpperCase() ?? "") : "";

    if (!dataRaw || !valorRaw) continue;

    const data = parseDataBR(dataRaw);
    if (!data) continue;

    let valorNum = parseFloat(valorRaw.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(valorNum)) continue;

    let tipo: "C" | "D" = valorNum >= 0 ? "C" : "D";
    if (tipoExtra === "C" || tipoExtra.startsWith("CRED")) tipo = "C";
    if (tipoExtra === "D" || tipoExtra.startsWith("DEB")) {
      tipo = "D";
      valorNum = -Math.abs(valorNum);
    }

    transacoes.push({
      fitid: `csv-${data}-${valorNum.toFixed(2)}-${memo.slice(0, 30)}`,
      data,
      valor: Math.abs(valorNum),
      tipo,
      memo,
    });
  }

  return transacoes;
}

function parsarLinhaCSV(linha: string, sep: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') { inQuote = !inQuote; continue; }
    if (c === sep && !inQuote) { cells.push(cur); cur = ""; continue; }
    cur += c;
  }
  cells.push(cur);
  return cells;
}

function parseDataBR(s: string): string | null {
  // Aceita DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
  let m = s.match(/^(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

// ----------------------------------------------------------------------------
// Detecta formato e parseia
// ----------------------------------------------------------------------------
export function parseExtrato(texto: string): { formato: "ofx" | "csv"; transacoes: TransacaoExtrato[] } {
  const inicio = texto.slice(0, 500).toUpperCase();
  if (inicio.includes("OFXHEADER") || inicio.includes("<OFX") || inicio.includes("<STMTTRN")) {
    return { formato: "ofx", transacoes: parseOFX(texto) };
  }
  return { formato: "csv", transacoes: parseCSV(texto) };
}

// ----------------------------------------------------------------------------
// Matching com lançamentos previstos
// ----------------------------------------------------------------------------
export interface LancamentoPrevisto {
  id: string;
  data_lancamento: string;
  valor: number;
  tipo: "repasse" | "rendimento" | "devolucao" | "despesa" | "estorno";
  descricao: string;
}

export interface MatchResult {
  transacao: TransacaoExtrato;
  /** Lançamento previsto a conciliar (se houver match) */
  match: LancamentoPrevisto | null;
  /** Ação proposta */
  acao: "conciliar" | "criar" | "ignorar";
  /** Tipo de lançamento a criar (quando ação=criar) */
  tipoCriar: "repasse" | "rendimento" | "despesa";
}

/**
 * Classifica heurística para entradas no extrato:
 * - Se valor bate com a parcela do convênio (±1 centavo) OU memo contém TED/SEMAS/FMAS/REPASSE → repasse
 * - Se memo contém RENDIMENTO/JUROS/APLICAC → rendimento
 * - Senão, valores grandes (≥ parcela/2) viram repasse; pequenos viram rendimento
 */
export function classificarEntrada(
  t: TransacaoExtrato,
  parcelaConvenio?: number
): "repasse" | "rendimento" {
  const memo = (t.memo || "").toUpperCase();
  if (/RENDIMENTO|JUROS|APLICAC|RESGATE/i.test(memo)) return "rendimento";
  if (parcelaConvenio && Math.abs(t.valor - parcelaConvenio) < 0.5) return "repasse";
  if (/TED|TRANSFER|SEMAS|FMAS|REPASSE|CONCEDENTE|MUNICIP/i.test(memo)) return "repasse";
  if (parcelaConvenio && t.valor >= parcelaConvenio * 0.5) return "repasse";
  return "rendimento";
}

export function calcularMatches(
  transacoes: TransacaoExtrato[],
  previstos: LancamentoPrevisto[],
  janelaDias = 3
): MatchResult[] {
  const usados = new Set<string>();
  const results: MatchResult[] = [];

  for (const t of transacoes) {
    let match: LancamentoPrevisto | null = null;
    let melhorDiff = Infinity;

    for (const p of previstos) {
      if (usados.has(p.id)) continue;
      // Tipo compatível
      const tipoOk =
        (t.tipo === "C" && (p.tipo === "repasse" || p.tipo === "rendimento")) ||
        (t.tipo === "D" && p.tipo === "despesa");
      if (!tipoOk) continue;
      // Valor exato (tolerância de centavo)
      if (Math.abs(t.valor - p.valor) > 0.01) continue;
      // Janela de data
      const diff = Math.abs(diasEntre(t.data, p.data_lancamento));
      if (diff > janelaDias) continue;
      if (diff < melhorDiff) {
        match = p;
        melhorDiff = diff;
      }
    }

    if (match) {
      usados.add(match.id);
      results.push({
        transacao: t,
        match,
        acao: "conciliar",
        tipoCriar: t.tipo === "C" ? "rendimento" : "despesa",
      });
    } else {
      results.push({
        transacao: t,
        match: null,
        acao: "criar",
        tipoCriar: t.tipo === "C" ? "rendimento" : "despesa",
      });
    }
  }

  return results;
}

function diasEntre(a: string, b: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return (da - db) / 86_400_000;
}
