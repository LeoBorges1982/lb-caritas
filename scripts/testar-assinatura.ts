/**
 * Testes da assinatura eletrônica — rodam contra o código REAL, com dados
 * simulados. Não tocam no banco nem em produção.
 *
 *   npx tsx scripts/testar-assinatura.ts
 */
import assert from "node:assert/strict";
import {
  calcularHashPrestacao,
  montarStatusSignatarios,
  resumirAssinaturas,
  hashLegivel,
  type Assinatura,
} from "../src/lib/assinaturas";
import {
  motivoInvalido,
  cpfConfere,
  gerarToken,
  MAX_TENTATIVAS,
  type ConviteAssinatura,
} from "../src/lib/convites";
import { mascararCPF } from "../src/lib/utils";
import type { PrestacaoConsolidada } from "../src/lib/prestacoes";

// ---------------------------------------------------------------------------
// Cenário simulado: prestação de agosto/2026 da Cáritas
// ---------------------------------------------------------------------------

type Pagamento = {
  data: string;
  credor: string;
  cpf_cnpj: string | null;
  item_orcamento: string;
  nf_rec: string | null;
  ob: string | null;
  valor: number;
};

function pag(data: string, credor: string, cpf: string, valor: number): Pagamento {
  return { data, credor, cpf_cnpj: cpf, item_orcamento: "Salário", nf_rec: null, ob: "OB-123", valor };
}

function prestacaoSimulada(): PrestacaoConsolidada {
  const base = {
    prestacao: {
      id: "p-1", tipo: "parcial", numero_parcela: 8,
      periodo_inicio: "2026-08-01", periodo_fim: "2026-08-31",
      status: "rascunho", protocolo: null, protocolada_em: null,
      analisada_em: null, parecer_tecnico: null, glosa_total: 0,
      observacoes: null, criado_em: "2026-09-01",
    },
    convenio: {
      id: "c-1", numero: "001/FMAS/2025",
      gestor_osc: "Padre Célio Barbosa do Nascimento",
      gestor_osc_cpf: "085.738.797-93",
      elaborador_nome: "GISELLE LUIS DA SILVA",
      elaborador_cpf: "115.807.227-92",
      responsavel_legal_nome: "Padre José Vilanova Santos",
      responsavel_legal_cpf: "132.314.017-47",
      contabilista_nome: "JOSIANE TOMEN",
      contabilista_cpf: "079.400.777-09",
      contabilista_crc: "CRC/RJ 112875/O-2",
    },
    osc: { nome: "Cáritas Diocesana de Nova Iguaçu", cnpj: "32.404.916/0001-06" },
    receita: {
      repasses_municipais: 21000, rendimentos_aplicacao: 125.06,
      recursos_osc: 0, outras_receitas: 0, saldo_periodo_anterior: 20125.06,
      total: 41250.12,
    },
    despesa: {
      rh: { total: 18000, linhas: [] },
      materiais: { total: 1617.7, linhas: [] },
      servicos: { total: 0, linhas: [] },
      locacao: { total: 0, linhas: [] },
      outras: 0, devolvido: 0, saldo_proximo: 21632.42, total: 41250.12,
    },
    pagamentos: {
      rh: [
        pag("2026-08-05", "LUZENILDA DA SILVA", "111.222.333-44", 2504.52),
        pag("2026-08-05", "MARIA DAS DORES", "555.666.777-88", 1800.0),
      ],
      materiais: [pag("2026-08-12", "SUPERMERCADO X", "11.222.333/0001-44", 1617.7)],
      servicos: [], locacao: [], outras: [], devolvidos: [],
    },
  };
  return base as unknown as PrestacaoConsolidada;
}

function assinatura(over: Partial<Assinatura> = {}): Assinatura {
  return {
    id: "a-1", convenio_id: "c-1", entidade: "prestacao", entidade_id: "p-1",
    papel: "contabilista", nome: "JOSIANE TOMEN", cpf: "079.400.777-09",
    registro_profissional: "CRC/RJ 112875/O-2",
    hash_documento: "", algoritmo: "SHA-256",
    assinado_em: "2026-09-02T18:36:00Z", assinado_por_email: null,
    ip: "200.1.2.3", revogada: false,
    ...over,
  };
}

function convite(over: Partial<ConviteAssinatura> = {}): ConviteAssinatura {
  return {
    id: "cv-1", token: "tok", convenio_id: "c-1", entidade: "prestacao",
    entidade_id: "p-1", papel: "contabilista", nome: "JOSIANE TOMEN",
    cpf: "079.400.777-09", registro_profissional: "CRC/RJ 112875/O-2",
    hash_documento: "HASH-A", criado_em: "2026-09-01T10:00:00Z",
    criado_por_email: "contato@lbcontabilrj.com",
    expira_em: "2026-10-01T10:00:00Z", usado_em: null, assinatura_id: null,
    cancelado: false, tentativas: 0,
    ...over,
  };
}

// ---------------------------------------------------------------------------

let ok = 0;
const falhas: string[] = [];

function teste(nome: string, fn: () => void) {
  try {
    fn();
    ok++;
    console.log("  [ok] " + nome);
  } catch (e) {
    falhas.push(nome);
    console.log("  [FALHOU] " + nome);
    console.log("        " + (e instanceof Error ? e.message.split("\n")[0] : String(e)));
  }
}

console.log("\nHASH - determinismo e deteccao de adulteracao");

teste("mesmo conteudo produz sempre o mesmo hash", () => {
  assert.equal(calcularHashPrestacao(prestacaoSimulada()), calcularHashPrestacao(prestacaoSimulada()));
});

teste("hash tem 64 caracteres hexadecimais (SHA-256)", () => {
  assert.match(calcularHashPrestacao(prestacaoSimulada()), /^[0-9a-f]{64}$/);
});

teste("mudar UM CENTAVO num pagamento muda o hash", () => {
  const b = prestacaoSimulada();
  (b.pagamentos.rh as Pagamento[])[0].valor = 2504.53;
  assert.notEqual(calcularHashPrestacao(prestacaoSimulada()), calcularHashPrestacao(b));
});

teste("trocar o credor de um pagamento muda o hash", () => {
  const b = prestacaoSimulada();
  (b.pagamentos.rh as Pagamento[])[0].credor = "OUTRA PESSOA";
  assert.notEqual(calcularHashPrestacao(prestacaoSimulada()), calcularHashPrestacao(b));
});

teste("trocar a data de um pagamento muda o hash", () => {
  const b = prestacaoSimulada();
  (b.pagamentos.rh as Pagamento[])[0].data = "2026-08-28";
  assert.notEqual(calcularHashPrestacao(prestacaoSimulada()), calcularHashPrestacao(b));
});

teste("incluir um pagamento novo muda o hash", () => {
  const b = prestacaoSimulada();
  (b.pagamentos.rh as Pagamento[]).push(pag("2026-08-20", "FANTASMA LTDA", "99.999.999/0001-99", 5000));
  assert.notEqual(calcularHashPrestacao(prestacaoSimulada()), calcularHashPrestacao(b));
});

teste("remover um pagamento muda o hash", () => {
  const b = prestacaoSimulada();
  (b.pagamentos.rh as Pagamento[]).pop();
  assert.notEqual(calcularHashPrestacao(prestacaoSimulada()), calcularHashPrestacao(b));
});

teste("alterar o saldo do periodo anterior muda o hash", () => {
  const b = prestacaoSimulada();
  (b.receita as { saldo_periodo_anterior: number }).saldo_periodo_anterior = 19000;
  assert.notEqual(calcularHashPrestacao(prestacaoSimulada()), calcularHashPrestacao(b));
});

teste("REORDENAR os pagamentos NAO muda o hash (sem falso alarme)", () => {
  const b = prestacaoSimulada();
  (b.pagamentos.rh as Pagamento[]).reverse();
  assert.equal(calcularHashPrestacao(prestacaoSimulada()), calcularHashPrestacao(b));
});

teste("hash legivel sai em blocos de 4, maiusculo", () => {
  const h = hashLegivel(calcularHashPrestacao(prestacaoSimulada()));
  assert.match(h, /^[0-9A-F]{4}( [0-9A-F]{4})+$/);
});

console.log("\nAUTORIA - quem assinou nao pode ser reescrito");

teste("exibe o nome gravado na ASSINATURA, nao o do cadastro atual", () => {
  const c = prestacaoSimulada();
  const h = calcularHashPrestacao(c);
  (c.convenio as unknown as { contabilista_nome: string }).contabilista_nome = "IMPOSTOR SILVA";
  (c.convenio as unknown as { contabilista_cpf: string }).contabilista_cpf = "999.999.999-99";
  const s = montarStatusSignatarios(c, [assinatura({ hash_documento: h })], h);
  const contab = s.find((x) => x.papel === "contabilista")!;
  assert.equal(contab.nome, "JOSIANE TOMEN", "deveria manter quem realmente assinou");
  assert.equal(contab.cpf, "079.400.777-09");
});

teste("marca substituido quando o responsavel muda apos assinar", () => {
  const c = prestacaoSimulada();
  const h = calcularHashPrestacao(c);
  (c.convenio as unknown as { contabilista_nome: string }).contabilista_nome = "OUTRA PESSOA";
  const s = montarStatusSignatarios(c, [assinatura({ hash_documento: h })], h);
  assert.equal(s.find((x) => x.papel === "contabilista")!.substituido, true);
});

teste("quem NAO assinou mostra o previsto no convenio", () => {
  const c = prestacaoSimulada();
  const h = calcularHashPrestacao(c);
  const s = montarStatusSignatarios(c, [], h);
  const gestor = s.find((x) => x.papel === "gestor_osc")!;
  assert.equal(gestor.nome, "Padre Célio Barbosa do Nascimento");
  assert.equal(gestor.assinatura, null);
});

console.log("\nDIVERGENCIA - documento alterado depois de assinado");

teste("hash igual ao assinado: NAO diverge", () => {
  const c = prestacaoSimulada();
  const h = calcularHashPrestacao(c);
  const s = montarStatusSignatarios(c, [assinatura({ hash_documento: h })], h);
  assert.equal(s.find((x) => x.papel === "contabilista")!.divergente, false);
});

teste("lancamento alterado apos a assinatura: DIVERGE", () => {
  const hashAssinado = calcularHashPrestacao(prestacaoSimulada());
  const depois = prestacaoSimulada();
  (depois.pagamentos.rh as Pagamento[])[0].valor = 9999.99;
  const hashAgora = calcularHashPrestacao(depois);
  const s = montarStatusSignatarios(depois, [assinatura({ hash_documento: hashAssinado })], hashAgora);
  assert.equal(s.find((x) => x.papel === "contabilista")!.divergente, true);
});

teste("resumo acusa documento nao integro quando ha divergencia", () => {
  const c = prestacaoSimulada();
  const s = montarStatusSignatarios(c, [assinatura({ hash_documento: "HASH-VELHO" })], calcularHashPrestacao(c));
  const r = resumirAssinaturas(s);
  assert.equal(r.divergentes, 1);
  assert.equal(r.integro, false);
});

teste("resumo conta 4 de 4 quando todos assinam", () => {
  const c = prestacaoSimulada();
  const h = calcularHashPrestacao(c);
  const papeis = ["gestor_osc", "elaborador", "responsavel_legal", "contabilista"] as const;
  const todas = papeis.map((papel, i) => assinatura({ id: "a-" + i, papel, hash_documento: h }));
  const r = resumirAssinaturas(montarStatusSignatarios(c, todas, h));
  assert.equal(r.assinadas, 4);
  assert.equal(r.completo, true);
  assert.equal(r.integro, true);
});

console.log("\nLINK DE ASSINATURA - validacao do convite");

const AGORA = "2026-09-05T12:00:00Z";

teste("convite normal e valido", () => {
  assert.equal(motivoInvalido(convite(), "HASH-A", AGORA), null);
});

teste("recusa convite cancelado", () => {
  assert.equal(motivoInvalido(convite({ cancelado: true }), "HASH-A", AGORA), "cancelado");
});

teste("recusa convite ja usado (uso unico)", () => {
  assert.equal(motivoInvalido(convite({ usado_em: "2026-09-03T10:00:00Z" }), "HASH-A", AGORA), "ja_usado");
});

teste("recusa convite expirado", () => {
  assert.equal(motivoInvalido(convite({ expira_em: "2026-09-01T00:00:00Z" }), "HASH-A", AGORA), "expirado");
});

teste("bloqueia apos esgotar as tentativas de CPF", () => {
  assert.equal(motivoInvalido(convite({ tentativas: MAX_TENTATIVAS }), "HASH-A", AGORA), "bloqueado");
});

teste("recusa se o documento mudou depois do link ser enviado", () => {
  assert.equal(motivoInvalido(convite(), "HASH-B", AGORA), "documento_alterado");
});

console.log("\nIDENTIDADE - conferencia de CPF");

teste("aceita CPF com pontuacao", () => {
  assert.equal(cpfConfere("079.400.777-09", "079.400.777-09"), true);
});

teste("aceita CPF digitado sem pontuacao", () => {
  assert.equal(cpfConfere("07940077709", "079.400.777-09"), true);
});

teste("recusa CPF de outra pessoa", () => {
  assert.equal(cpfConfere("111.222.333-44", "079.400.777-09"), false);
});

teste("recusa CPF incompleto", () => {
  assert.equal(cpfConfere("079.400.777", "079.400.777-09"), false);
});

teste("recusa quando nao ha CPF cadastrado", () => {
  assert.equal(cpfConfere("07940077709", null), false);
});

console.log("\nPRIVACIDADE E TOKEN");

teste("CPF publico sai mascarado", () => {
  assert.equal(mascararCPF("079.400.777-09"), "***.400.777-**");
});

teste("tokens gerados sao unicos", () => {
  const t = new Set(Array.from({ length: 500 }, () => gerarToken()));
  assert.equal(t.size, 500);
});

teste("token tem entropia suficiente", () => {
  assert.ok(gerarToken().length >= 40, "token curto demais");
});

console.log("\n" + "-".repeat(58));
if (falhas.length) {
  console.log(ok + " passaram, " + falhas.length + " FALHARAM:");
  falhas.forEach((f) => console.log("  - " + f));
  process.exit(1);
}
console.log("Todos os " + ok + " testes passaram.");
