import Link from "next/link";

export default function AguardandoAprovacaoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-800 to-blue-950 p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
        <span className="text-5xl">⏳</span>
        <h1 className="text-xl font-bold text-slate-800">Acesso em aprovação</h1>
        <p className="text-sm text-slate-600">
          Seu cadastro foi recebido e está aguardando a aprovação da coordenação do{" "}
          <strong>RCC Grupo Daniel</strong>. Assim que for liberado, você poderá acessar o app.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-3"
        >
          Voltar ao login
        </Link>
      </div>
    </div>
  );
}
