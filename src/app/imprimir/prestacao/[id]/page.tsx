import { notFound, redirect } from "next/navigation";
import { consolidarPrestacao } from "@/lib/prestacoes";
import { getSessao } from "@/lib/sessao";
import PrestacaoOficial from "@/components/PrestacaoOficial";
import ImprimirToolbar from "./ImprimirToolbar";

export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ id: string }> }

export default async function ImprimirPrestacaoPage({ params }: PageProps) {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");

  const { id } = await params;
  const c = await consolidarPrestacao(id);
  if (!c) notFound();

  return (
    <>
      <ImprimirToolbar nomeArquivo={`Prestacao_${c.convenio.numero?.replace(/\//g, "_")}_${c.prestacao.periodo_inicio}_a_${c.prestacao.periodo_fim}`} />
      <div className="standalone-pdf">
        <PrestacaoOficial c={c} />
      </div>
      <style>{`
        html, body { background: #f1f5f9; margin: 0; padding: 0; }
        .standalone-pdf {
          width: 210mm;
          padding: 14mm 12mm;
          margin: 0 auto;
          background: white;
          min-height: 297mm;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        @media screen { .standalone-pdf { margin-top: 70px; margin-bottom: 24px; } }
        @media print {
          @page { size: A4; margin: 0; }
          html, body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { display: none !important; }
          .standalone-pdf {
            width: 210mm;
            padding: 14mm 12mm;
            margin: 0;
            box-shadow: none;
            min-height: auto;
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
