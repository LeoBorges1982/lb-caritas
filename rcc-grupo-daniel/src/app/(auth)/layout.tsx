export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-800 to-blue-950 p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center">
            <span className="text-3xl">🕊️</span>
          </div>
          <h1 className="text-2xl font-bold text-white">RCC Grupo Daniel</h1>
          <p className="text-blue-200 text-sm mt-1">Renovação Carismática Católica</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6">{children}</div>
        <p className="text-center text-blue-300 text-xs mt-6">
          “Onde dois ou três estiverem reunidos em meu nome, ali estou no meio deles.” — Mt 18,20
        </p>
      </div>
    </div>
  );
}
