"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, User, Sparkles, Trash2 } from "lucide-react";

interface Mensagem {
  id: string;
  papel: "usuario" | "leo";
  conteudo: string;
}

export default function AjudaChat() {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [mensagens, enviando]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cache = sessionStorage.getItem("lb_caritas_ajuda_chat");
      if (cache) {
        try { setMensagens(JSON.parse(cache)); } catch {}
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("lb_caritas_ajuda_chat", JSON.stringify(mensagens));
    }
  }, [mensagens]);

  async function enviar() {
    if (!pergunta.trim()) return;
    setEnviando(true);
    const minha: Mensagem = { id: crypto.randomUUID(), papel: "usuario", conteudo: pergunta.trim() };
    const novas = [...mensagens, minha];
    setMensagens(novas);
    setPergunta("");

    const historico = mensagens.map((m) => ({
      role: m.papel === "leo" ? "assistant" : "user",
      content: m.conteudo,
    }));

    try {
      const r = await fetch("/api/ajuda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historico, pergunta: minha.conteudo }),
      });
      const data = await r.json();
      if (r.ok) {
        setMensagens((prev) => [...prev, { id: crypto.randomUUID(), papel: "leo", conteudo: data.resposta }]);
      } else {
        setMensagens((prev) => [...prev, { id: crypto.randomUUID(), papel: "leo", conteudo: `❌ Erro: ${data.erro || "desconhecido"}` }]);
      }
    } catch {
      setMensagens((prev) => [...prev, { id: crypto.randomUUID(), papel: "leo", conteudo: `❌ Falha de conexão` }]);
    }
    setEnviando(false);
  }

  function limpar() {
    if (!confirm("Limpar histórico do chat?")) return;
    setMensagens([]);
    if (typeof window !== "undefined") sessionStorage.removeItem("lb_caritas_ajuda_chat");
  }

  return (
    <>
      {!aberto && (
        <button onClick={() => setAberto(true)}
          className="print:hidden fixed bottom-6 right-6 z-40 bg-gradient-to-br from-[#1e3a8a] to-[#d4af37] text-white p-4 rounded-full shadow-xl hover:scale-105 transition-transform"
          title="Dúvidas sobre o sistema ou convênios?">
          <MessageCircle size={22} />
          {mensagens.length === 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">!</span>
          )}
        </button>
      )}

      {aberto && (
        <div className="print:hidden fixed bottom-6 right-6 z-40 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-3rem)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
          <div className="bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] text-white px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
              <Sparkles size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Ajuda — LB Cáritas</div>
              <div className="text-[10px] text-blue-200">Sistema · Convênios · Lei 13.019</div>
            </div>
            {mensagens.length > 0 && (
              <button onClick={limpar} className="text-blue-200 hover:text-white p-1" title="Limpar">
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={() => setAberto(false)} className="text-blue-200 hover:text-white p-1">
              <X size={18} />
            </button>
          </div>

          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {mensagens.length === 0 && (
              <div className="text-center text-sm text-slate-600 py-8">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#d4af37] flex items-center justify-center text-white mb-3">
                  <Sparkles size={28} />
                </div>
                <p className="font-semibold text-slate-800 mb-1">Olá! Posso ajudar?</p>
                <p className="text-xs text-slate-500 max-w-[260px] mx-auto">Pergunte sobre o sistema OU sobre convênios públicos da Lei 13.019/2014.</p>
                <div className="mt-4 space-y-1.5 text-left max-w-[300px] mx-auto">
                  {[
                    "Como lanço uma despesa que estoura o teto da rubrica?",
                    "Como encerrar um convênio e prorrogar?",
                    "Qual diferença entre Termo de Colaboração e Fomento?",
                    "Como gerar prestação de contas pra prefeitura?",
                    "O que é saldo anterior e quando usar?",
                  ].map((s, i) => (
                    <button key={i} onClick={() => setPergunta(s)}
                      className="block w-full text-left text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg hover:border-[#1e3a8a]/40 hover:bg-blue-50">
                      💡 {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mensagens.map((m) => (
              <div key={m.id} className={`flex gap-2 ${m.papel === "usuario" ? "justify-end" : ""}`}>
                {m.papel === "leo" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#d4af37] flex items-center justify-center text-white shrink-0">
                    <Sparkles size={12} />
                  </div>
                )}
                <div className={`max-w-[78%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                  m.papel === "leo" ? "bg-white border border-slate-200 text-slate-800" : "bg-[#1e3a8a] text-white"
                }`}>{m.conteudo}</div>
                {m.papel === "usuario" && (
                  <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center shrink-0">
                    <User size={12} className="text-slate-600" />
                  </div>
                )}
              </div>
            ))}

            {enviando && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#d4af37] flex items-center justify-center text-white shrink-0">
                  <Sparkles size={12} />
                </div>
                <div className="bg-white border border-slate-200 text-slate-500 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                  <Loader2 className="animate-spin" size={12} /> pensando...
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-200 bg-white">
            <div className="flex gap-2">
              <input value={pergunta} onChange={(e) => setPergunta(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                disabled={enviando}
                placeholder="Pergunte sobre o sistema ou convênios..."
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm disabled:opacity-50" />
              <button onClick={enviar} disabled={enviando || !pergunta.trim()}
                className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white px-3 py-2 rounded-lg disabled:opacity-50">
                <Send size={14} />
              </button>
            </div>
            <div className="text-[10px] text-slate-400 mt-1.5 text-center">Powered by Claude · suas perguntas não são salvas no servidor</div>
          </div>
        </div>
      )}
    </>
  );
}
