import type { PrestacaoConsolidada } from "@/lib/prestacoes";
import { formatBRL, formatDate, formatCNPJ, formatCPF, cn } from "@/lib/utils";

/**
 * Relatório Oficial de Execução Financeira — formato SEMAS-NI (Lei 13.019/14 art. 63).
 * Layout A4 retrato, P&B, tipografia serifada, sem cores.
 * Usado na tela interna e na rota /imprimir standalone.
 */
export default function PrestacaoOficial({ c }: { c: PrestacaoConsolidada }) {
  const ehFinal = c.prestacao.tipo === "final";

  return (
    <div className="prestacao-oficial">
      {/* CSS global do documento (só afeta esse componente) */}
      <style>{`
        .prestacao-oficial {
          font-family: "Times New Roman", "Liberation Serif", Georgia, serif;
          font-size: 9.5pt;
          color: #000;
          line-height: 1.25;
        }
        .prestacao-oficial table {
          width: 100%;
          border-collapse: collapse;
          margin: 0;
          font-size: 8.5pt;
        }
        .prestacao-oficial table, .prestacao-oficial th, .prestacao-oficial td {
          border: 1px solid #000;
        }
        .prestacao-oficial th, .prestacao-oficial td {
          padding: 2px 4px;
          vertical-align: middle;
          text-align: left;
        }
        .prestacao-oficial th {
          background: #fff;
          font-weight: 700;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .prestacao-oficial .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .prestacao-oficial .center { text-align: center; }
        .prestacao-oficial .bold { font-weight: 700; }
        .prestacao-oficial .label { font-weight: 700; }
        .prestacao-oficial .muted { color: #555; font-style: italic; }
        .prestacao-oficial .total-row { font-weight: 700; border-top: 2px solid #000; }
        .prestacao-oficial h1.doc-title {
          font-size: 12pt; font-weight: 700; text-transform: uppercase;
          text-align: center; margin: 0 0 4px 0; letter-spacing: 0.03em;
        }
        .prestacao-oficial h2.secao {
          font-size: 10pt; font-weight: 700; text-transform: uppercase;
          padding: 3px 5px; margin: 8px 0 3px 0;
          border: 1px solid #000; background: #fff; letter-spacing: 0.02em;
        }
        .prestacao-oficial h3.subsecao {
          font-size: 9.5pt; font-weight: 700;
          padding: 2px 5px; margin: 6px 0 3px 0;
          border: 1px solid #000; background: #fff;
        }
        .prestacao-oficial .cabecalho-doc {
          display: grid; grid-template-columns: 1fr auto;
          gap: 8px; align-items: flex-start;
          margin-bottom: 8px; padding-bottom: 6px;
          border-bottom: 2px solid #000;
        }
        .prestacao-oficial .cabecalho-tipo {
          border: 1px solid #000; padding: 2px 0;
          font-size: 9pt; min-width: 220px;
        }
        .prestacao-oficial .cabecalho-tipo div {
          display: grid; grid-template-columns: 1fr auto;
          padding: 3px 8px; gap: 8px;
        }
        .prestacao-oficial .cabecalho-tipo div + div { border-top: 1px solid #000; }
        .prestacao-oficial .chk {
          display: inline-block; width: 14px; height: 14px;
          border: 1px solid #000; text-align: center;
          line-height: 12px; font-weight: 700; font-family: monospace;
        }
        .prestacao-oficial .assinaturas-wrap {
          margin-top: 10px;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 14px 24px;
        }
        .prestacao-oficial .assinatura-bloco {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .prestacao-oficial .assinatura-titulo {
          font-size: 8.5pt; font-weight: 700; text-transform: uppercase;
          text-align: center; margin-bottom: 32px; letter-spacing: 0.04em;
        }
        .prestacao-oficial .assinatura-linha {
          border-top: 1px solid #000; padding-top: 3px;
          text-align: center; font-size: 8.5pt;
        }
        .prestacao-oficial .footer-doc {
          margin-top: 24px; padding-top: 6px;
          border-top: 1px solid #000;
          font-size: 8.5pt; text-align: center; color: #333;
        }
        .prestacao-oficial .obs-bloco {
          border: 1px solid #000; padding: 6px 8px;
          font-size: 9pt; margin-top: 4px;
        }

        /* IMPRESSÃO */
        @page {
          size: A4;
          margin: 2.5cm 2cm 2.5cm 2cm;      /* topo | direita | base | esquerda */
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .prestacao-oficial { font-size: 10pt; padding-bottom: 0.6cm; }
          .prestacao-oficial table { page-break-inside: auto; }
          .prestacao-oficial tr { page-break-inside: avoid; page-break-after: auto; orphans: 3; widows: 3; }
          .prestacao-oficial thead { display: table-header-group; }
          .prestacao-oficial tfoot { display: table-footer-group; }
          .prestacao-oficial h2.secao, .prestacao-oficial h3.subsecao {
            page-break-after: avoid;
            break-after: avoid-page;
          }
          .prestacao-oficial .assinaturas-wrap {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-top: 28px;
          }
          .prestacao-oficial .footer-doc {
            margin-top: 16px;
          }
          /* evita conteúdo colado na borda inferior */
          .prestacao-oficial > *:last-child {
            margin-bottom: 0.8cm;
          }
        }
      `}</style>

      {/* CABEÇALHO */}
      <h1 className="doc-title">Relatório de Execução Financeira</h1>

      <div className="cabecalho-doc">
        <div style={{ fontSize: "9pt" }}>
          <strong style={{ fontSize: "10pt" }}>Fundo Municipal de Assistência Social — FMAS</strong>
          <br />
          Secretaria Municipal de Assistência Social · Prefeitura de Nova Iguaçu/RJ
        </div>
        <div className="cabecalho-tipo">
          <div>
            <span>Final</span>
            <span className="chk">{ehFinal ? "X" : ""}</span>
          </div>
          <div>
            <span>Parcial</span>
            <span className="chk">{ehFinal ? "" : "X"}</span>
          </div>
          <div>
            <span>Parcela</span>
            <strong>{c.prestacao.numero_parcela ? `${c.prestacao.numero_parcela}ª` : "—"}</strong>
          </div>
          <div>
            <span>Período</span>
            <strong>{formatDate(c.prestacao.periodo_inicio)} a {formatDate(c.prestacao.periodo_fim)}</strong>
          </div>
        </div>
      </div>

      {/* 1 — DADOS DA PARCEIRA */}
      <h2 className="secao">1 — Dados da Parceira</h2>
      <table>
        <tbody>
          <tr>
            <td className="label" style={{ width: "10%" }}>OSC:</td>
            <td colSpan={3}>{c.osc.nome}</td>
            <td className="label" style={{ width: "8%" }}>CNPJ:</td>
            <td style={{ width: "16%" }}>{c.osc.cnpj ? formatCNPJ(c.osc.cnpj) : "—"}</td>
          </tr>
          <tr>
            <td className="label">Endereço:</td>
            <td colSpan={3}>{c.osc.endereco ?? "—"}</td>
            <td className="label">CEP:</td>
            <td>{c.osc.cep ?? "—"}</td>
          </tr>
          <tr>
            <td className="label">Município:</td>
            <td>{c.osc.cidade ?? "—"}</td>
            <td className="label">Telefone:</td>
            <td>{c.osc.telefone ?? "—"}</td>
            <td className="label">E-mail:</td>
            <td>{c.osc.email ?? "—"}</td>
          </tr>
          <tr>
            <td className="label">Resp. Técnico:</td>
            <td>{c.convenio.responsavel_tecnico_nome ?? "—"}</td>
            <td className="label">Função:</td>
            <td>{c.convenio.responsavel_tecnico_funcao ?? "—"}</td>
            <td className="label">E-mail:</td>
            <td>{c.convenio.responsavel_tecnico_email ?? "—"}</td>
          </tr>
          <tr>
            <td className="label">CPF:</td>
            <td colSpan={5}>{c.convenio.responsavel_tecnico_cpf ?? "—"}</td>
          </tr>
        </tbody>
      </table>

      {/* 2 — DADOS DO INSTRUMENTO JURÍDICO */}
      <h2 className="secao">2 — Dados do Instrumento Jurídico</h2>
      <table>
        <thead>
          <tr>
            <th style={{ width: "11%" }}>Processo</th>
            <th style={{ width: "14%" }}>Termo de Colaboração</th>
            <th style={{ width: "10%" }}>Termo Aditivo</th>
            <th>Objeto</th>
            <th style={{ width: "13%" }}>Valor Global (R$)</th>
            <th style={{ width: "17%" }}>Vigência</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="center">2024/103819</td>
            <td className="center">{c.convenio.numero}</td>
            <td className="center">1</td>
            <td>{c.convenio.objeto}</td>
            <td className="num">{formatBRL(c.convenio.valor_total).replace("R$", "").trim()}</td>
            <td className="center">
              {formatDate(c.convenio.vigencia_inicio)} a {formatDate(c.convenio.vigencia_fim)}
            </td>
          </tr>
          <tr className="total-row">
            <td colSpan={4} className="center">Total</td>
            <td className="num">{formatBRL(c.convenio.valor_total).replace("R$", "").trim()}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      {/* 3.1 — Demonstrativo da Receita e Despesa */}
      <h2 className="secao">3 — Demonstrativos Financeiros</h2>
      <h3 className="subsecao">3.1 — Demonstrativo da Receita e Despesa</h3>

      <table>
        <thead>
          <tr>
            <th style={{ width: "34%" }}>Receita</th>
            <th style={{ width: "12%" }}>Valor (R$)</th>
            <th style={{ width: "24%" }}>Grupo</th>
            <th style={{ width: "20%" }}>Despesa</th>
            <th style={{ width: "10%" }}>Valor (R$)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>(A) Repasses Municipais no Período</td>
            <td className="num">{formatBRL(c.receita.repasses_municipais).replace("R$", "").trim()}</td>
            <td rowSpan={5} className="center label">(1) Recursos Humanos</td>
            <td>(1.1) Salários e Adicionais</td>
            <td className="num">{formatBRL(c.despesa.rh.linhas[0]?.valor ?? 0).replace("R$", "").trim()}</td>
          </tr>
          <tr>
            <td>(B) Rendimentos de Repasses Municipais</td>
            <td className="num">{formatBRL(c.receita.rendimentos_aplicacao).replace("R$", "").trim()}</td>
            <td>(1.2) Encargos patronais, sociais e trabalhistas</td>
            <td className="num">{formatBRL(c.despesa.rh.linhas[1]?.valor ?? 0).replace("R$", "").trim()}</td>
          </tr>
          <tr>
            <td>(C) Recursos da OSC</td>
            <td className="num">{formatBRL(c.receita.recursos_osc).replace("R$", "").trim()}</td>
            <td>(1.3) Provisionamento (férias, 13º, aviso, multa FGTS)</td>
            <td className="num">{formatBRL(c.despesa.rh.linhas[2]?.valor ?? 0).replace("R$", "").trim()}</td>
          </tr>
          <tr>
            <td>(D) Outras Receitas</td>
            <td className="num">{formatBRL(c.receita.outras_receitas).replace("R$", "").trim()}</td>
            <td>(1.4) Vale Transporte</td>
            <td className="num">{formatBRL(c.despesa.rh.linhas[3]?.valor ?? 0).replace("R$", "").trim()}</td>
          </tr>
          <tr>
            <td>(E) Saldo do Período Anterior</td>
            <td className="num">{formatBRL(c.receita.saldo_periodo_anterior).replace("R$", "").trim()}</td>
            <td>(1.5) Exames Admissionais/Demissionais</td>
            <td className="num">{formatBRL(c.despesa.rh.linhas[4]?.valor ?? 0).replace("R$", "").trim()}</td>
          </tr>

          {c.despesa.materiais.linhas.map((l, i) => (
            <tr key={`m${i}`}>
              <td></td><td></td>
              {i === 0 && (
                <td rowSpan={c.despesa.materiais.linhas.length || 1} className="center label">
                  (2) Materiais de Consumo
                </td>
              )}
              <td>({l.codigo}) {l.nome}</td>
              <td className="num">{formatBRL(l.valor).replace("R$", "").trim()}</td>
            </tr>
          ))}

          {c.despesa.servicos.linhas.map((l, i) => (
            <tr key={`s${i}`}>
              <td></td><td></td>
              {i === 0 && (
                <td rowSpan={c.despesa.servicos.linhas.length || 1} className="center label">
                  (3) Prestação de Serviços
                </td>
              )}
              <td>({l.codigo}) {l.nome}</td>
              <td className="num">{formatBRL(l.valor).replace("R$", "").trim()}</td>
            </tr>
          ))}

          {c.despesa.locacao.linhas.map((l, i) => (
            <tr key={`l${i}`}>
              <td></td><td></td>
              {i === 0 && (
                <td rowSpan={c.despesa.locacao.linhas.length || 1} className="center label">
                  (4) Locação de Bens
                </td>
              )}
              <td>({l.codigo}) {l.nome}</td>
              <td className="num">{formatBRL(l.valor).replace("R$", "").trim()}</td>
            </tr>
          ))}

          <tr>
            <td></td><td></td>
            <td colSpan={2} className="label">(5) Outras Despesas</td>
            <td className="num">{formatBRL(c.despesa.outras).replace("R$", "").trim()}</td>
          </tr>
          <tr>
            <td></td><td></td>
            <td colSpan={2} className="label">(6) Valores Devolvidos ao Município</td>
            <td className="num">{formatBRL(c.despesa.devolvido).replace("R$", "").trim()}</td>
          </tr>
          <tr>
            <td className="label">(F) Saldo p/ Próximo Período (transporte)</td>
            <td className="num bold">{formatBRL(c.despesa.saldo_proximo).replace("R$", "").trim()}</td>
            <td colSpan={2} className="label">(7) Saldo para o Próximo Período</td>
            <td className="num bold">{formatBRL(c.despesa.saldo_proximo).replace("R$", "").trim()}</td>
          </tr>
          <tr className="total-row">
            <td>Total (A+B+C+D+E)</td>
            <td className="num">{formatBRL(c.receita.total).replace("R$", "").trim()}</td>
            <td colSpan={2}>Total (1+2+3+4+5+6+7)</td>
            <td className="num">{formatBRL(c.despesa.total).replace("R$", "").trim()}</td>
          </tr>
        </tbody>
      </table>

      {/* 3.2 — Conciliação Bancária */}
      <h3 className="subsecao">3.2 — Conciliação Bancária</h3>
      <table>
        <tbody>
          <tr>
            <td className="label" style={{ width: "13%" }}>Banco:</td>
            <td>{c.convenio.banco ?? "—"}</td>
            <td className="label" style={{ width: "10%" }}>Agência:</td>
            <td style={{ width: "10%" }}>{c.convenio.agencia ?? "—"}</td>
            <td className="label" style={{ width: "13%" }}>Conta:</td>
            <td>{c.convenio.conta_corrente ?? "—"}</td>
          </tr>
          <tr>
            <td colSpan={5} className="label">(A) Saldo no Extrato Bancário em: {formatDate(c.conciliacao.data_extrato)}</td>
            <td className="num bold">{formatBRL(c.conciliacao.saldo_extrato).replace("R$", "").trim()}</td>
          </tr>
          <tr><td colSpan={6} className="label">(B) Total de Créditos Pendentes</td></tr>
          <LinhaConcil label="Repasses Municipais no Período" valor={c.conciliacao.creditos_pendentes_repasses} />
          <LinhaConcil label="Rendimentos de Repasses Municipais" valor={c.conciliacao.creditos_pendentes_rendimentos} />
          <LinhaConcil label="Recursos da OSC" valor={c.conciliacao.creditos_pendentes_osc} />
          <LinhaConcil label="Outras Receitas" valor={c.conciliacao.creditos_pendentes_outras} />
          <tr><td colSpan={6} className="label">(C) Total de Débitos Pendentes</td></tr>
          <LinhaConcil label="Recursos Humanos" valor={c.conciliacao.debitos_pendentes_rh} />
          <LinhaConcil label="Materiais de Consumo" valor={c.conciliacao.debitos_pendentes_materiais} />
          <LinhaConcil label="Locação de Bens" valor={c.conciliacao.debitos_pendentes_locacao} />
          <LinhaConcil label="Prestação de Serviços" valor={c.conciliacao.debitos_pendentes_servicos} />
          <LinhaConcil label="Outras Despesas" valor={c.conciliacao.debitos_pendentes_outras} />
          <tr className="total-row">
            <td colSpan={5}>(A + B − C) = Saldo Contábil em: {formatDate(c.conciliacao.data_extrato)}</td>
            <td className="num">{formatBRL(c.conciliacao.saldo_contabil).replace("R$", "").trim()}</td>
          </tr>
        </tbody>
      </table>

      {/* 3.3 — Relação de Pagamentos */}
      <h3 className="subsecao">3.3 — Relação de Pagamentos</h3>
      <TabelaPagamentos titulo="3.3.1 — Recursos Humanos" linhas={c.pagamentos.rh} colItem="Item de Orçamento" />
      <TabelaPagamentos titulo="3.3.2 — Materiais de Consumo" linhas={c.pagamentos.materiais} colItem="Item de Orçamento" />
      <TabelaPagamentos titulo="3.3.3 — Prestação de Serviços" linhas={c.pagamentos.servicos} colItem="Item de Orçamento" />
      <TabelaPagamentos titulo="3.3.4 — Locação de Bens" linhas={c.pagamentos.locacao} colItem="Item de Orçamento" />
      <TabelaPagamentos titulo="3.3.5 — Outras Despesas" linhas={c.pagamentos.outras} colItem="Descrição" />
      <TabelaPagamentos titulo="3.3.6 — Valores Devolvidos ao Município" linhas={c.pagamentos.devolvidos} colItem="Motivo" />

      <table style={{ marginTop: "4px" }}>
        <tbody>
          <tr className="total-row">
            <td>Total Geral (3.3.1 + 3.3.2 + 3.3.3 + 3.3.4 + 3.3.5 + 3.3.6)</td>
            <td className="num" style={{ width: "13%" }}>{formatBRL(c.pagamentos.total).replace("R$", "").trim()}</td>
          </tr>
        </tbody>
      </table>

      {/* 4 — Acompanhamento */}
      <h2 className="secao">4 — Acompanhamento da Execução Financeira</h2>
      <table style={{ fontSize: "8.5pt" }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ width: "38%" }}>Descrição</th>
            <th rowSpan={2}>Previsto Mensal</th>
            <th colSpan={2}>Realizado no Período</th>
            <th rowSpan={2}>Previsto Acumulado</th>
            <th colSpan={2}>Realizado até o Período</th>
          </tr>
          <tr>
            <th>Concedente</th>
            <th>Total</th>
            <th>Concedente</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {c.acompanhamento.linhas.map((l) => (
            <tr key={l.codigo}>
              <td>({l.codigo}) {l.nome}</td>
              <td className="num">{formatBRL(l.previsto_mensal).replace("R$", "").trim()}</td>
              <td className="num">{formatBRL(l.executado_periodo_concedente).replace("R$", "").trim()}</td>
              <td className="num bold">{formatBRL(l.executado_periodo_total).replace("R$", "").trim()}</td>
              <td className="num">{formatBRL(l.previsto_acumulado).replace("R$", "").trim()}</td>
              <td className="num">{formatBRL(l.executado_acumulado_concedente).replace("R$", "").trim()}</td>
              <td className="num bold">{formatBRL(l.executado_acumulado_total).replace("R$", "").trim()}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td>Total das Despesas</td>
            <td></td><td></td>
            <td className="num">{formatBRL(c.acompanhamento.total_periodo).replace("R$", "").trim()}</td>
            <td></td><td></td>
            <td className="num">{formatBRL(c.acompanhamento.total_acumulado).replace("R$", "").trim()}</td>
          </tr>
        </tbody>
      </table>

      {/* 5 — Notas Explicativas */}
      <h2 className="secao">5 — Notas Explicativas (N.E.)</h2>
      <div className="obs-bloco">
        <p style={{ margin: 0, marginBottom: "4px" }}>
          <strong>NE-1</strong> (3.2) Utilidades Públicas — inclui despesas com energia elétrica, água/esgoto, gás, telefone e internet.
        </p>
        {c.prestacao.observacoes && (
          <p style={{ margin: 0, whiteSpace: "pre-line" }}>{c.prestacao.observacoes}</p>
        )}
        <p className="muted" style={{ margin: 0, marginTop: "4px", fontSize: "8pt" }}>
          * Notas explicativas complementam as informações da planilha.
        </p>
      </div>

      {/* 6 — Assinaturas */}
      <h2 className="secao">6 — Assinaturas</h2>
      <div className="assinaturas-wrap">
        <BlocoAssinatura
          titulo="Responsável da OSC (Gestor)"
          nome={c.convenio.gestor_osc}
          cpf={c.convenio.gestor_osc_cpf}
          data={formatDate(c.prestacao.periodo_fim)}
        />
        <BlocoAssinatura
          titulo="Responsável pela Elaboração"
          nome={c.convenio.elaborador_nome}
          cpf={c.convenio.elaborador_cpf}
          data={formatDate(c.prestacao.periodo_fim)}
        />
        <BlocoAssinatura
          titulo="Responsável Legal da OSC"
          nome={c.convenio.responsavel_legal_nome}
          cpf={c.convenio.responsavel_legal_cpf}
          data={formatDate(c.prestacao.periodo_fim)}
        />
        <BlocoAssinatura
          titulo="Contabilista Responsável"
          nome={c.convenio.contabilista_nome}
          cpf={c.convenio.contabilista_cpf}
          data={formatDate(c.prestacao.periodo_fim)}
          crc={c.convenio.contabilista_crc}
        />
      </div>

      <div className="footer-doc">
        Nova Iguaçu/RJ — Prestação de Contas elaborada conforme Lei Federal 13.019/2014 (art. 63) e Decreto Municipal 11.252/2018
      </div>
    </div>
  );
}

// =========== Componentes auxiliares ===========
interface Pagamento {
  data: string; credor: string; cpf_cnpj: string | null;
  item_orcamento: string; nf_rec: string | null; ob: string | null; valor: number;
}

function TabelaPagamentos({ titulo, linhas, colItem }: {
  titulo: string; linhas: Pagamento[]; colItem: string;
}) {
  const total = linhas.reduce((s, l) => s + l.valor, 0);
  return (
    <div style={{ marginTop: "8px" }}>
      <h3 className="subsecao" style={{ marginBottom: 0 }}>{titulo}</h3>
      <table>
        <thead>
          <tr>
            <th style={{ width: "9%" }}>Data</th>
            <th style={{ width: "26%" }}>Credor</th>
            <th style={{ width: "14%" }}>CPF/CNPJ</th>
            <th>{colItem}</th>
            <th style={{ width: "9%" }}>NF/Rec.</th>
            <th style={{ width: "9%" }}>O.B.</th>
            <th style={{ width: "11%" }}>Valor (R$)</th>
          </tr>
        </thead>
        <tbody>
          {linhas.length === 0 ? (
            <tr>
              <td colSpan={6} className="center muted">Sem lançamentos no período.</td>
              <td className="num">0,00</td>
            </tr>
          ) : (
            linhas.map((l, i) => (
              <tr key={i}>
                <td className="center">{formatDate(l.data)}</td>
                <td>{l.credor}</td>
                <td className="center">
                  {l.cpf_cnpj
                    ? (l.cpf_cnpj.replace(/\D/g, "").length === 14
                        ? formatCNPJ(l.cpf_cnpj)
                        : formatCPF(l.cpf_cnpj))
                    : "—"}
                </td>
                <td>{l.item_orcamento}</td>
                <td className="center">{l.nf_rec ?? "—"}</td>
                <td className="center">{l.ob ?? "—"}</td>
                <td className="num">{formatBRL(l.valor).replace("R$", "").trim()}</td>
              </tr>
            ))
          )}
          <tr className="total-row">
            <td colSpan={6} className="center">Total {titulo.split("—")[0]?.trim()}</td>
            <td className="num">{formatBRL(total).replace("R$", "").trim()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function LinhaConcil({ label, valor }: { label: string; valor: number }) {
  return (
    <tr>
      <td colSpan={5} style={{ paddingLeft: "20px" }}>{label}</td>
      <td className="num">{formatBRL(valor).replace("R$", "").trim()}</td>
    </tr>
  );
}

function BlocoAssinatura({ titulo, nome, cpf, data, crc }: {
  titulo: string; nome: string | null; cpf: string | null; data: string; crc?: string | null;
}) {
  return (
    <div className="assinatura-bloco">
      <div className="assinatura-titulo">{titulo}</div>
      <div className="assinatura-linha">
        <strong>{nome ?? "—"}</strong>
        {crc && <span> · {crc}</span>}
        <br />
        <span style={{ fontSize: "8.5pt" }}>
          CPF: {cpf ?? "—"} · Data: {data}
        </span>
      </div>
    </div>
  );
}

// Compat: mantém o export unused mas correto
export const _cnHelper = cn;
