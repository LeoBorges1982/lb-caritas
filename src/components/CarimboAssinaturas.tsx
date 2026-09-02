import { hashLegivel, type SignatarioStatus } from "@/lib/assinaturas";
import { formatDate, formatCPF } from "@/lib/utils";

interface Props {
  signatarios: SignatarioStatus[];
  hashAtual: string;
  urlVerificacao: string;
  qrDataUrl: string | null;
}

/**
 * Carimbo de assinatura eletrônica impresso no rodapé do documento oficial.
 * Só aparece quando há ao menos uma assinatura registrada.
 */
export default function CarimboAssinaturas({ signatarios, hashAtual, urlVerificacao, qrDataUrl }: Props) {
  const assinados = signatarios.filter((s) => s.assinatura && !s.divergente);
  if (assinados.length === 0) return null;

  return (
    <div className="carimbo-assinaturas">
      <style>{`
        .carimbo-assinaturas {
          margin-top: 14px;
          border: 1px solid #000;
          padding: 8px 10px;
          font-size: 7.5pt;
          line-height: 1.35;
          page-break-inside: avoid;
          break-inside: avoid;
          display: grid;
          grid-template-columns: 1fr 92px;
          gap: 10px;
          align-items: start;
        }
        .carimbo-assinaturas .titulo {
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin-bottom: 4px;
          font-size: 7.5pt;
        }
        .carimbo-assinaturas ul { margin: 0 0 4px 0; padding: 0; list-style: none; }
        .carimbo-assinaturas li { margin-bottom: 2px; }
        .carimbo-assinaturas .papel { font-weight: 700; }
        .carimbo-assinaturas .hash {
          font-family: "Courier New", monospace;
          font-size: 6.5pt;
          word-break: break-all;
          margin-top: 3px;
        }
        .carimbo-assinaturas .legal { font-size: 6.5pt; margin-top: 3px; }
        .carimbo-assinaturas .qr { text-align: center; }
        .carimbo-assinaturas .qr img { width: 88px; height: 88px; display: block; }
        .carimbo-assinaturas .qr span { font-size: 6pt; display: block; margin-top: 2px; }
      `}</style>

      <div>
        <div className="titulo">Documento assinado eletronicamente</div>
        <ul>
          {assinados.map((s) => (
            <li key={s.papel}>
              <span className="papel">{s.rotulo}:</span>{" "}
              {s.nome}
              {s.cpf ? ` — CPF ${formatCPF(s.cpf)}` : ""}
              {s.registro ? ` — ${s.registro}` : ""}
              {" — "}
              {formatDate(s.assinatura!.assinado_em, "dd/MM/yyyy 'às' HH:mm")}
            </li>
          ))}
        </ul>
        <div className="hash">Código de integridade (SHA-256): {hashLegivel(hashAtual, 16)}</div>
        <div className="legal">
          Assinatura eletrônica avançada (Lei 14.063/2020, art. 4º, II). Autoria comprovada por acesso
          autenticado ao sistema; integridade comprovada por resumo criptográfico do conteúdo.
          Confira a autenticidade em: {urlVerificacao}
        </div>
      </div>

      <div className="qr">
        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="QR code para verificação de autenticidade" />
        )}
        <span>Verifique aqui</span>
      </div>
    </div>
  );
}
