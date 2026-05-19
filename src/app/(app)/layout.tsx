import { redirect } from "next/navigation";
import { getSessao } from "@/lib/sessao";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="lg:pl-60">
        <Header email={sessao.email} nome={sessao.nome} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
