import { notFound, redirect } from "next/navigation";
import { consolidarPrestacao } from "@/lib/prestacoes";
import { getSessao } from "@/lib/sessao";
import {
  listarAssinaturas,
  calcularHashPrestacao,
  montarStatusSignatarios,
} from "@/lib/assinaturas";
import { gerarQrDataUrl, urlVerificacao } from "@/lib/qr";
import PrestacaoOficial from "@/components/PrestacaoOficial";
import CarimboAssinaturas from "@/components/CarimboAssinaturas";
import ImprimirToolbar from "./ImprimirToolbar";

export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ id: string }> }

export default async function ImprimirPrestacaoPage({ params }: PageProps) {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");

  const { id } = await params;
  const c = await consolidarPrestacao(id);
  if (!c) notFound();

  // Carimbo de assinatura eletrônica (só aparece se houver assinatura válida)
  const assinaturas = await listarAssinaturas("prestacao", id);
  const hashAtual = calcularHashPrestacao(c);
  const signatarios = montarStatusSignatarios(c, assinaturas, hashAtual);
  const url = urlVerificacao(id);
  const qr = assinaturas.length > 0 ? await gerarQrDataUrl(url) : null;

  return (
    <>
      <ImprimirToolbar nomeArquivo={`Prestacao_${c.convenio.numero?.replace(/\//g, "_")}_${c.prestacao.periodo_inicio}_a_${c.prestacao.periodo_fim}`} />
      <div className="standalone-pdf">
        <PrestacaoOficial
          c={c}
          carimbo={
            <CarimboAssinaturas
              signatarios={signatarios}
              hashAtual={hashAtual}
              urlVerificacao={url}
              qrDataUrl={qr}
            />
          }
        />
      </div>
      <style>{`
        html, body { background: #f1f5f9; margin: 0; padding: 0; }
        .standalone-pdf {
          width: 210mm;
          padding: 22mm 20mm;              /* margens visíveis na TELA */
          margin: 0 auto;
          background: white;
          min-height: 297mm;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        @media screen { .standalone-pdf { margin-top: 70px; margin-bottom: 24px; } }

        @media print {
          /* Margens da FOLHA A4 impressa — cada quebra respeita esses valores */
          @page {
            size: A4;
            margin: 22mm 18mm 24mm 18mm;   /* topo | direita | base | esquerda */
          }
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { display: none !important; }
          /* Na impressão o wrapper NÃO tem mais padding próprio
             — quem cria margem é o @page acima */
          .standalone-pdf {
            width: auto;
            padding: 0;
            margin: 0;
            box-shadow: none;
            min-height: auto;
            background: white !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
}
