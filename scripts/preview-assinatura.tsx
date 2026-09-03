/**
 * Renderiza o bloco "6 — Assinaturas" com dados simulados e salva um HTML,
 * para conferir visualmente como fica o documento assinado — sem precisar
 * de banco nem de deploy.
 *
 *   npm run preview-assinatura
 *
 * Gera preview-assinatura.html na raiz do projeto. Abra no navegador e use
 * Ctrl+P para ver como sai impresso.
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

function pag(data: string, credor: string, cpf: string, item: string, valor: number) {
  return { data, credor, cpf_cnpj: cpf, item_orcamento: item, nf_rec: "0001", ob: "OB-4471", valor };
}

const c = {
  prestacao: {
    id: "b8b4ca97-f5db-42e7-bf27-66d4989bff78", tipo: "parcial", numero_parcela: 8,
    periodo_inicio: "2026-08-01", periodo_fim: "2026-08-31", status: "rascunho",
    protocolo: null, protocolada_em: null, analisada_em: null,
    parecer_tecnico: null, glosa_total: 0, observacoes: null, criado_em: "2026-09-01",
  },
  convenio: {
    id: "c-1", numero: "001/FMAS/2025", tipo: "termo_colaboracao",
    objeto: "Serviço de Convivência e Fortalecimento de Vínculos",
    valor_total: 252000, valor_repasse: 252000, valor_contrapartida: 0,
    vigencia_inicio: "2025-01-01", vigencia_fim: "2026-12-31",
    data_assinatura: "2024-12-20", banco: "Banco do Brasil", agencia: "1234-5",
    conta_corrente: "98765-4", conta_aplicacao: null,
    gestor_osc: "Padre Célio Barbosa do Nascimento", gestor_osc_cpf: "085.738.797-93",
    elaborador_nome: "GISELLE LUIS DA SILVA", elaborador_cpf: "115.807.227-92",
    responsavel_legal_nome: "Padre José Vilanova Santos", responsavel_legal_cpf: "132.314.017-47",
    contabilista_nome: "JOSIANE TOMEN", contabilista_cpf: "079.400.777-09",
    contabilista_crc: "CRC/RJ 112875/O-2",
    responsavel_tecnico_nome: "GISELLE LUIS DA SILVA",
    responsavel_tecnico_cpf: "115.807.227-92",
    responsavel_tecnico_email: "giselle@caritasni.org.br",
    responsavel_tecnico_funcao: "Coordenadora do Serviço",
    nota_empenho_numero: "2026NE000412", nota_empenho_valor: 21000,
  },
  osc: {
    nome: "Cáritas Diocesana de Nova Iguaçu", cnpj: "32.404.916/0001-06",
    endereco: "Rua Dr. Paulo Fróes Machado, 88", cep: "26210-190",
    cidade: "Nova Iguaçu", estado: "RJ", telefone: "(21) 2667-1010",
    email: "contato@caritasni.org.br",
  },
  orgao: { nome: "Secretaria Municipal de Assistência Social", sigla: "SEMAS", fundo: "FMAS" },
  receita: {
    repasses_municipais: 21000, rendimentos_aplicacao: 125.06, recursos_osc: 0,
    outras_receitas: 0, saldo_periodo_anterior: 20125.06, total: 41250.12,
  },
  despesa: {
    rh: {
      total: 8865.6,
      linhas: [
        { codigo: "1.1", nome: "Salários", valor: 4256.56, valor_ne: 4256.56 },
        { codigo: "1.2", nome: "Encargos Sociais", valor: 2104.52, valor_ne: 2104.52 },
        { codigo: "1.3", nome: "Férias e 13º", valor: 2504.52, valor_ne: 2504.52 },
      ],
    },
    materiais: {
      total: 1617.7,
      linhas: [{ codigo: "2.1", nome: "Gêneros Alimentícios", valor: 1617.7, valor_ne: 1617.7 }],
    },
    servicos: { total: 0, linhas: [] },
    locacao: { total: 0, linhas: [] },
    outras: 0, outras_ne: 0, devolvido: 0,
    saldo_proximo: 30766.82, total: 41250.12,
  },
  conciliacao: {
    saldo_extrato: 30766.82, total_creditos_pendentes: 0,
    total_debitos_pendentes: 0, saldo_contabil: 30766.82,
  },
  pagamentos: {
    rh: [
      pag("2026-08-05", "LUZENILDA DA SILVA SANTOS", "111.222.333-44", "Salários", 4256.56),
      pag("2026-08-07", "INSS / FGTS", "00.394.460/0001-41", "Encargos Sociais", 2104.52),
      pag("2026-08-05", "LUZENILDA DA SILVA SANTOS", "111.222.333-44", "Férias", 2504.52),
    ],
    materiais: [pag("2026-08-12", "SUPERMERCADO GUANABARA LTDA", "31.545.401/0001-30", "Gêneros Alimentícios", 1617.7)],
    servicos: [], locacao: [], outras: [], devolvidos: [],
  },
  acompanhamento: { linhas: [] },
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

// Cenário: três assinaram pelo link, o responsável legal ainda não
const assinaturas = [
  assin("gestor_osc", "Padre Célio Barbosa do Nascimento", "085.738.797-93", "2026-09-02T23:49:00-03:00"),
  assin("elaborador", "GISELLE LUIS DA SILVA", "115.807.227-92", "2026-09-03T09:14:00-03:00"),
  assin("contabilista", "JOSIANE TOMEN", "079.400.777-09", "2026-09-03T10:02:00-03:00", "CRC/RJ 112875/O-2"),
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
<title>Preview — bloco de assinaturas</title>
<style>
  body { margin:0; background:#f1f5f9; font-family:system-ui, sans-serif; }
  .folha { width:210mm; margin:24px auto; background:#fff; box-shadow:0 4px 20px rgba(0,0,0,.08); }
  .aviso { max-width:210mm; margin:16px auto 0; padding:10px 14px; background:#fff7ed;
           border:1px solid #fed7aa; border-radius:8px; font-size:13px; color:#7c2d12; }
  @media print { body { background:#fff } .folha { box-shadow:none; margin:0; width:auto } .aviso { display:none } }
</style></head><body>
<div class="aviso"><strong>Pré-visualização com dados fictícios.</strong>
Três responsáveis assinaram pelo link; o Responsável Legal ainda não —
repare que a linha dele continua em branco para assinatura à mão.</div>
<div class="folha">${html}</div>
</body></html>`;

writeFileSync("preview-assinatura.html", pagina, "utf8");
console.log("Gerado: preview-assinatura.html");
console.log("Hash do documento simulado: " + hash.slice(0, 32) + "...");
