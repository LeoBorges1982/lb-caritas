"use client";

import { useState, useTransition, useRef } from "react";
import { Upload, FileText, Image as ImageIcon, File as FileIcon, Download, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import {
  uploadAnexo,
  obterUrlDownloadAnexo,
  deletarAnexo,
} from "@/app/(app)/lancamentos/[id]/anexos-actions";
import { tipoIcone, formatarTamanho, type Anexo } from "@/lib/anexos";
import { formatDate, cn } from "@/lib/utils";

interface Props {
  convenioId: string;
  lancamentoId: string;
  anexos: Anexo[];
}

export default function AnexosLancamento({ convenioId, lancamentoId, anexos }: Props) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleUpload(arquivos: FileList | null) {
    if (!arquivos || arquivos.length === 0) return;
    setErro(null);

    startTransition(async () => {
      try {
        for (const arquivo of Array.from(arquivos)) {
          const fd = new FormData();
          fd.append("arquivo", arquivo);
          fd.append("convenio_id", convenioId);
          fd.append("entidade", "lancamento");
          fd.append("entidade_id", lancamentoId);
          await uploadAnexo(fd);
        }
        if (inputRef.current) inputRef.current.value = "";
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro ao subir arquivo");
      }
    });
  }

  async function handleDownload(id: string) {
    try {
      const url = await obterUrlDownloadAnexo(id);
      window.open(url, "_blank");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao baixar");
    }
  }

  function handleDelete(id: string, nome: string) {
    if (!confirm(`Excluir o anexo "${nome}"?`)) return;
    setErro(null);
    startTransition(async () => {
      try {
        await deletarAnexo(id);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro ao excluir");
      }
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Anexos · {anexos.length}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="text-xs bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
        >
          {pending ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {pending ? "Enviando..." : "Enviar arquivo"}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.heic"
          onChange={(e) => handleUpload(e.target.files)}
          className="hidden"
        />
      </div>

      {erro && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 text-xs">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {anexos.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
          <FileIcon size={24} className="mx-auto text-slate-400 mb-2" />
          <p className="text-xs text-slate-500">
            Nenhum anexo. Suba a NF, recibo ou comprovante (PDF/JPG/PNG, máx 10 MB).
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {anexos.map((a) => {
            const icone = tipoIcone(a.mime_type);
            const Icon = icone === "pdf" ? FileText : icone === "imagem" ? ImageIcon : FileIcon;
            const cor =
              icone === "pdf" ? "text-red-600 bg-red-50" :
              icone === "imagem" ? "text-emerald-600 bg-emerald-50" :
              "text-slate-600 bg-slate-100";
            return (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cor)}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => handleDownload(a.id)}
                    className="text-sm text-slate-800 hover:text-[#1e3a8a] font-medium block truncate text-left w-full"
                  >
                    {a.nome}
                  </button>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {formatarTamanho(a.tamanho_bytes)} · {formatDate(a.criado_em, "dd/MM/yyyy 'às' HH:mm")}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleDownload(a.id)}
                    className="p-1.5 text-slate-400 hover:text-[#1e3a8a] hover:bg-slate-100 rounded"
                    title="Baixar"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id, a.nome)}
                    disabled={pending}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
