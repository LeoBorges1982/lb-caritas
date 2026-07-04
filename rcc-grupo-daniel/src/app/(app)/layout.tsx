import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { BottomNav, Sidebar } from "@/components/AppNav";
import Header from "@/components/Header";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.status !== "ativo") redirect("/aguardando-aprovacao");

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <Sidebar role={user.role} />
      <div className="lg:pl-60">
        <Header name={user.name} role={user.role} />
        <main className="p-4 lg:p-6 pb-24 lg:pb-8 max-w-5xl mx-auto">{children}</main>
      </div>
      <BottomNav role={user.role} />
    </div>
  );
}
