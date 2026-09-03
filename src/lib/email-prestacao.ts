import type { PrestacaoConsolidada } from "@/lib/prestacoes";
import { hashLegivel, type SignatarioStatus } from "@/lib/assinaturas";
import { formatBRL, formatDate, formatCNPJ } from "@/lib/utils";

/**
 * E-mail avisando que a prestação foi assinada por todos os responsáveis.
 * Traz os números fechados, quem assinou e quando, e o link do documento.
 */
export function montarEmailPrestacaoAssinada(params: {
  c: PrestacaoConsolidada;
  signatarios: SignatarioStatus[];
  hash: string;
  urlDocumento: string;
  urlVerificacao: string;
}): { assunto: string; html: string } {
  const { c, signatarios, hash, urlDocumento, urlVerificacao } = params;

  const periodo = `${formatDate(c.prestacao.periodo_inicio, "dd/MM/yyyy")} a ${formatDate(
    c.prestacao.periodo_fim,
    "dd/MM/yyyy"
  )}`;
  const competencia = formatDate(c.prestacao.periodo_fim, "MM/yyyy");

  const assunto =
    `Prestação de contas ${c.convenio.numero} — ${competencia} assinada por todos`;

  const linhasAssinatura = signatarios
    .filter((s) => s.assinatura)
    .map(
      (s) => `
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;">${s.rotulo}</div>
          <div style="font-size:14px;color:#0f172a;font-weight:600;">${escapar(s.nome ?? "—")}</div>
          <div style="font-size:12px;color:#64748b;">
            ${formatDate(s.assinatura!.assinado_em, "dd/MM/yyyy 'às' HH:mm")}
            ${s.registro ? " · " + escapar(s.registro) : ""}
          </div>
        </td>
      </tr>`
    )
    .join("");

  const numero = (v: number) => formatBRL(v);

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <div style="background:#1e3a8a;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#bfdbfe;">
        Prestação de contas assinada
      </div>
      <div style="font-size:19px;font-weight:600;margin-top:4px;">
        Convênio ${escapar(c.convenio.numero)} · ${competencia}
      </div>
      <div style="font-size:13px;color:#dbeafe;margin-top:4px;">
        ${escapar(c.osc.nome)}
      </div>
    </div>

    <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;">
      <p style="margin:0 0 18px;font-size:14px;color:#334155;line-height:1.6;">
        Todos os responsáveis assinaram a prestação de contas do período
        <strong>${periodo}</strong>. O documento está fechado e pronto para
        protocolo na SEMAS.
      </p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
        <tr>
          <td style="padding:7px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Total de receitas</td>
          <td style="padding:7px 0;text-align:right;font-weight:600;color:#0f172a;border-bottom:1px solid #f1f5f9;">${numero(c.receita.total)}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Saldo do período anterior</td>
          <td style="padding:7px 0;text-align:right;color:#0f172a;border-bottom:1px solid #f1f5f9;">${numero(c.receita.saldo_periodo_anterior)}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Despesas do período</td>
          <td style="padding:7px 0;text-align:right;color:#0f172a;border-bottom:1px solid #f1f5f9;">${numero(c.acompanhamento.total_periodo)}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#64748b;font-weight:600;">Saldo p/ próximo período</td>
          <td style="padding:7px 0;text-align:right;font-weight:700;color:#0f172a;">${numero(c.despesa.saldo_proximo)}</td>
        </tr>
      </table>

      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:6px;">
        Assinaturas coletadas
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
        ${linhasAssinatura || '<tr><td style="font-size:13px;color:#64748b;">—</td></tr>'}
      </table>

      <a href="${urlDocumento}"
         style="display:block;background:#1e3a8a;color:#fff;text-decoration:none;
                padding:13px 20px;border-radius:8px;font-size:15px;font-weight:600;
                text-align:center;">
        Abrir o documento para imprimir ou salvar em PDF
      </a>
      <p style="margin:10px 0 0;font-size:12px;color:#64748b;text-align:center;line-height:1.5;">
        Abre no sistema (é preciso estar logado). Use Ctrl+P e escolha
        “Salvar como PDF”.
      </p>

      <div style="margin-top:22px;padding-top:18px;border-top:1px solid #f1f5f9;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;">
          Código de integridade do conteúdo (SHA-256)
        </div>
        <div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:#334155;margin-top:4px;word-break:break-all;">
          ${hashLegivel(hash, 16)}
        </div>
        <p style="margin:10px 0 0;font-size:12px;color:#64748b;line-height:1.5;">
          Qualquer pessoa pode conferir a autenticidade sem login em
          <a href="${urlVerificacao}" style="color:#1e3a8a;">${urlVerificacao}</a>.
          Se algum valor do período for alterado no sistema, este código muda e
          as assinaturas deixam de conferir.
        </p>
      </div>
    </div>

    <div style="padding:16px 24px;font-size:11px;color:#64748b;text-align:center;line-height:1.6;">
      OSC ${escapar(c.osc.nome)} · CNPJ ${formatCNPJ(c.osc.cnpj)}<br>
      Assinatura eletrônica avançada nos termos do art. 4º, II da Lei 14.063/2020.<br>
      Mensagem automática do sistema de gestão de convênios — não responda.
    </div>
  </div>
</body></html>`;

  return { assunto, html };
}

function escapar(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
