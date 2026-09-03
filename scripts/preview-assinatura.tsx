/**
 * Renderiza a prestação de contas com os dados REAIS de agosto/2026 e as
 * assinaturas eletrônicas, para conferir o documento antes do deploy —
 * sem precisar de banco.
 *
 *   npm run preview-assinatura
 *
 * Gera preview-assinatura.html na raiz. Abra no navegador; Ctrl+P mostra
 * como sai impresso.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import PrestacaoOficial from "../src/components/PrestacaoOficial";
import CarimboAssinaturas from "../src/components/CarimboAssinaturas";
import {
  calcularHashPrestacao,
  montarStatusSignatarios,
  type Assinatura,
} from "../src/lib/assinaturas";
import type { PrestacaoConsolidada } from "../src/lib/prestacoes";

function pag(
  data: string, credor: string, cpf: string | null,
  item: string, valor: number
) {
  return { data, credor, cpf_cnpj: cpf, item_orcamento: item, nf_rec: null, ob: null, valor };
}

function ac(
  codigo: string, nome: string, prevMes: number, realMes: number,
  prevAcum: number, realAcum: number
) {
  return {
    codigo, nome,
    previsto_mensal: prevMes,
    executado_periodo_concedente: realMes,
    executado_periodo_total: realMes,
    previsto_acumulado: prevAcum,
    executado_acumulado_concedente: realAcum,
    executado_acumulado_total: realAcum,
  };
}

const NOTAS = `1. (1.4) Custo Efetivo de Vale Transporte — ÚNICA rubrica sem execução no período. Não houve pagamento em razão de dispensa formal do benefício pela colaboradora beneficiária, conforme faculdade prevista no art. 5º do Decreto 95.247/87, que regulamenta a Lei 7.418/85. A declaração de dispensa encontra-se arquivada na sede da OSC à disposição da fiscalização. Execução acumulada no exercício: R$ 236,28 de um previsto acumulado de R$ 590,70, restando R$ 354,42 não executados, mantidos em saldo para os meses subsequentes ou para devolução ao final da vigência.

2. (1.1) Salários e Adicionais — Execução abaixo do previsto mensal em razão do gozo de férias da colaboradora Luzenilda Maria dos Santos (CPF 684.235.787-04), psicóloga, no período de 01/08 a 30/08/2026 (30 dias), cuja remuneração foi antecipada e integralmente paga na competência de julho/2026, nos termos do art. 145 da CLT. Houve retorno ao trabalho em 31/08/2026, sendo custeado 1 (um) dia proporcional ao teto da rubrica (R$ 2.527,17 / 31 dias = R$ 81,52). Os valores lançados observam estritamente os limites por função fixados no Plano de Trabalho aprovado; as diferenças em relação à remuneração efetiva dos empregados são suportadas pela OSC com recursos próprios, não onerando o presente convênio.

3. (1.2) Encargos Patronais — Recolhimento proporcional à folha efetivamente custeada pelo convênio no mês (29% sobre R$ 4.306,29).

4. (1.3) Provisionamento — Sem execução no período; a liquidação da provisão de férias da colaboradora referida ocorreu na competência de julho/2026.`;

// Dados reais da prestação de agosto/2026 (5ª parcela)
const c = {
  prestacao: {
    id: "b8b4ca97-f5db-42e7-bf27-66d4989bff78", tipo: "parcial", numero_parcela: 5,
    periodo_inicio: "2026-08-01", periodo_fim: "2026-08-31", status: "rascunho",
    protocolo: null, protocolada_em: null, analisada_em: null,
    parecer_tecnico: null, glosa_total: 0, observacoes: NOTAS, criado_em: "2026-09-01",
  },
  convenio: {
    id: "c-1", numero: "001/FMAS/2025", tipo: "termo_colaboracao",
    objeto: "Execução do Serviço de Atendimento à pessoas maiores de 18 anos, em situação de rua",
    valor_total: 155404.44, valor_repasse: 155404.44, valor_contrapartida: 0,
    vigencia_inicio: "2026-04-02", vigencia_fim: "2027-04-01",
    data_assinatura: "2025-04-01",
    banco: "Caixa Econômica Federal (104)", agencia: "185",
    conta_corrente: "5775987310", conta_aplicacao: null,
    processo_numero: "2024/103819", termo_aditivo: "1",
    gestor_osc: "Padre Célio Barbosa do Nascimento", gestor_osc_cpf: "085.738.797-93",
    elaborador_nome: "GISELLE LUIS DA SILVA", elaborador_cpf: "115.807.227-92",
    responsavel_legal_nome: "Padre José Vilanova Santos", responsavel_legal_cpf: "132.314.017-47",
    contabilista_nome: "JOSIANE TOMEN", contabilista_cpf: "079.400.777-09",
    contabilista_crc: "CRC/RJ 112875/O-2",
    responsavel_tecnico_nome: null, responsavel_tecnico_cpf: null,
    responsavel_tecnico_email: null, responsavel_tecnico_funcao: null,
    nota_empenho_numero: null, nota_empenho_valor: null,
  },
  osc: {
    nome: "Cáritas Diocesana de Nova Iguaçu — Casa da Solidariedade",
    cnpj: "28.732.246/0024-63",
    endereco: "Av. Getúlio de Moura, 1222 - Centro", cep: "26.221-040",
    cidade: "Nova Iguaçu", estado: "RJ", telefone: "(21) 2767-7677",
    email: "casasolidariedade@outlook.com",
  },
  orgao: {
    nome: "Secretaria Municipal de Assistência Social", sigla: "SEMAS", fundo: "FMAS",
  },
  receita: {
    repasses_municipais: 12950.37, rendimentos_aplicacao: 0, recursos_osc: 0,
    outras_receitas: 0, saldo_periodo_anterior: 20125.06, total: 33075.43,
  },
  despesa: {
    rh: {
      total: 5555.11,
      linhas: [
        { codigo: "1.1", nome: "Salários e Adicionais", valor: 4306.29, valor_ne: 4306.29 },
        { codigo: "1.2", nome: "Encargos patronais, sociais e trabalhistas", valor: 1248.82, valor_ne: 1248.82 },
        { codigo: "1.3", nome: "Provisionamento (férias, 13º, aviso, multa FGTS)", valor: 0, valor_ne: 0 },
        { codigo: "1.4", nome: "Vale Transporte", valor: 0, valor_ne: 0 },
        { codigo: "1.5", nome: "Exames Admissionais/Demissionais", valor: 0, valor_ne: 0 },
      ],
    },
    materiais: {
      total: 1617.7,
      linhas: [
        { codigo: "2.1", nome: "Gêneros Alimentícios", valor: 1617.7, valor_ne: 1617.7 },
        { codigo: "2.2", nome: "Higiene e Limpeza", valor: 0, valor_ne: 0 },
        { codigo: "2.3", nome: "Material de Escritório", valor: 0, valor_ne: 0 },
        { codigo: "2.4", nome: "Outros materiais", valor: 0, valor_ne: 0 },
      ],
    },
    servicos: {
      total: 0,
      linhas: [
        { codigo: "3.1", nome: "Serviços PJ", valor: 0, valor_ne: 0 },
        { codigo: "3.2", nome: "Utilidades Públicas (água/luz/internet)", valor: 0, valor_ne: 0 },
      ],
    },
    locacao: {
      total: 0,
      linhas: [
        { codigo: "4.1", nome: "Locação de Imóvel", valor: 0, valor_ne: 0 },
        { codigo: "4.2", nome: "Locação de Bens Móveis", valor: 0, valor_ne: 0 },
      ],
    },
    outras: 0, outras_ne: 0, devolvido: 0,
    saldo_proximo: 25902.62, total: 33075.43,
  },
  conciliacao: {
    saldo_extrato: 25902.62, total_creditos_pendentes: 0,
    total_debitos_pendentes: 0, saldo_contabil: 25902.62,
  },
  pagamentos: {
    rh: [
      pag("2026-08-25", "Ana Célia Chagas Thomaz", "104.905.617-56", "Salários e Adicionais", 2527.17),
      pag("2026-08-25", "Sulene Cavalcante da Silva", "092.910.067-00", "Salários e Adicionais", 1697.6),
      pag("2026-08-25", "Luzenilda Maria dos Santos", "684.235.787-04", "Salários e Adicionais", 81.52),
      pag("2026-08-25", "INSS / FGTS — Receita Federal", null, "Encargos Patronais (INSS, FGTS, PIS)", 1248.82),
    ],
    materiais: [
      pag("2026-08-15", "Cereais de Minas da Vila", "27.344.436/0001-54", "Gêneros Alimentícios", 1617.7),
    ],
    servicos: [], locacao: [], outras: [], devolvidos: [],
  },
  acompanhamento: {
    linhas: [
      ac("1.1", "Salários e Adicionais", 6751.94, 4306.29, 33759.7, 31030.8),
      ac("1.2", "Encargos Patronais (INSS, FGTS, PIS)", 1958.07, 1248.82, 9790.35, 9864.15),
      ac("1.3", "Provisionamento (férias+1/3, 13º, aviso, multa FGTS)", 2504.52, 0, 12522.6, 9590.05),
      ac("1.4", "Vale Transporte", 118.14, 0, 590.7, 236.28),
      ac("1.5", "Exames Admissionais/Demissionais", 0, 0, 0, 0),
      ac("2.1", "Gêneros Alimentícios", 1617.7, 1617.7, 8088.5, 8089.88),
      ac("2.2", "Higiene e Limpeza", 0, 0, 0, 0),
      ac("2.3", "Material de Escritório", 0, 0, 0, 0),
      ac("2.4", "Outros materiais", 0, 0, 0, 0),
      ac("3.1", "Serviços PJ", 0, 0, 0, 0),
      ac("3.2", "Utilidades Públicas (água/luz/internet)", 0, 0, 0, 0),
      ac("4.1", "Locação de Imóvel", 0, 0, 0, 0),
      ac("4.2", "Locação de Bens Móveis", 0, 0, 0, 0),
      ac("5.0", "Outras Despesas", 0, 0, 0, 0),
    ],
    total_periodo: 7172.81,
    total_acumulado: 58811.16,
  },
} as unknown as PrestacaoConsolidada;

const hash = calcularHashPrestacao(c);

function assin(papel: string, nome: string, cpf: string, quando: string, crc?: string): Assinatura {
  return {
    id: "a-" + papel, convenio_id: "c-1", entidade: "prestacao",
    entidade_id: c.prestacao.id, papel: papel as Assinatura["papel"],
    nome, cpf, registro_profissional: crc ?? null,
    hash_documento: hash, algoritmo: "SHA-256", assinado_em: quando,
    assinado_por_email: null, ip: "189.120.44.7", revogada: false,
  };
}

const assinaturas = [
  assin("gestor_osc", "Padre Célio Barbosa do Nascimento", "085.738.797-93", "2026-09-02T23:49:00-03:00"),
  assin("elaborador", "GISELLE LUIS DA SILVA", "115.807.227-92", "2026-09-02T23:50:00-03:00"),
  assin("responsavel_legal", "Padre José Vilanova Santos", "132.314.017-47", "2026-09-02T23:50:00-03:00"),
  assin("contabilista", "JOSIANE TOMEN", "079.400.777-09", "2026-09-02T23:48:00-03:00", "CRC/RJ 112875/O-2"),
];

const signatarios = montarStatusSignatarios(c, assinaturas, hash);
const url = "https://caritas.leoborgescontador.com.br/verificar/" + c.prestacao.id;

const html = renderToStaticMarkup(
  <PrestacaoOficial
    c={c}
    signatarios={signatarios}
    carimbo={
      <CarimboAssinaturas
        signatarios={signatarios}
        hashAtual={hash}
        urlVerificacao={url}
        qrDataUrl={null}
      />
    }
  />
);

const pagina = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Prestação de agosto/2026 — pré-visualização</title>
<style>
  body { margin:0; background:#f1f5f9; font-family:system-ui, sans-serif; }
  .folha { width:210mm; margin:24px auto; background:#fff; box-shadow:0 4px 20px rgba(0,0,0,.08); }
  .aviso { max-width:210mm; margin:16px auto 0; padding:10px 14px; background:#eff6ff;
           border:1px solid #bfdbfe; border-radius:8px; font-size:13px; color:#1e3a8a; }
  @media print { body { background:#fff } .folha { box-shadow:none; margin:0; width:auto } .aviso { display:none } }
</style></head><body>
<div class="aviso"><strong>Prestação de agosto/2026 com os dados reais</strong> —
mesmos números do PDF que você enviou. A única diferença é o bloco 6:
nome grafado sobre a linha, data e hora reais do ato e o carimbo de
verificação. O QR aparece só no documento gerado pelo sistema.</div>
<div class="folha">${html}</div>
</body></html>`;

writeFileSync("preview-assinatura.html", pagina, "utf8");
console.log("Gerado: preview-assinatura.html");
console.log("Total despesas do periodo: 7.172,81 | Saldo proximo: 25.902,62");
console.log("Hash: " + hash.slice(0, 32) + "...");
