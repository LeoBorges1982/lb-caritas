"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/session";

function get(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  return v === null || v === "" ? null : String(v);
}

export async function createPrayerRequest(fd: FormData) {
  const user = await requireRole(); // qualquer usuário ativo
  const db = adminClient();

  const title = get(fd, "title");
  if (!title) throw new Error("Título do pedido é obrigatório.");

  // moderação: pedidos públicos entram como pendentes se configurado
  const { data: settings } = await db.from("rcc_settings").select("moderate_prayers").eq("id", 1).single();
  const visibility = get(fd, "visibility") ?? "publico";
  const status =
    visibility === "publico" && settings?.moderate_prayers ? "pendente" : "ativo";

  const { error } = await db.from("rcc_prayer_requests").insert({
    member_id: user.member_id,
    title,
    description: get(fd, "description"),
    category: get(fd, "category") ?? "outro",
    visibility,
    status,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/oracao");
  redirect(status === "pendente" ? "/oracao?moderacao=1" : "/oracao");
}

export async function moderatePrayer(id: string, status: "ativo" | "atendido" | "arquivado") {
  const user = await requireRole("admin", "lider");
  const db = adminClient();
  const { error } = await db
    .from("rcc_prayer_requests")
    .update({ status, approved_by: status === "ativo" ? user.id : undefined })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/oracao");
}
