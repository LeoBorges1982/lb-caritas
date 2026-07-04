"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/session";

function get(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  return v === null || v === "" ? null : String(v);
}

export async function createAnnouncement(fd: FormData) {
  const user = await requireRole("admin", "lider");
  const db = adminClient();

  const title = get(fd, "title");
  const content = get(fd, "content");
  if (!title || !content) throw new Error("Título e conteúdo são obrigatórios.");

  const { error } = await db.from("rcc_announcements").insert({
    title,
    content,
    type: get(fd, "type") ?? "comunicado",
    target_audience: get(fd, "target_audience") ?? "todos",
    is_pinned: fd.get("is_pinned") === "on",
    publish_at: get(fd, "publish_at") ?? new Date().toISOString(),
    expires_at: get(fd, "expires_at"),
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/avisos");
  revalidatePath("/dashboard");
  redirect("/avisos");
}

export async function togglePin(id: string, pinned: boolean) {
  await requireRole("admin");
  const db = adminClient();
  await db.from("rcc_announcements").update({ is_pinned: pinned }).eq("id", id);
  revalidatePath("/avisos");
}

export async function deleteAnnouncement(id: string) {
  await requireRole("admin");
  const db = adminClient();
  await db.from("rcc_announcements").delete().eq("id", id);
  revalidatePath("/avisos");
  revalidatePath("/dashboard");
}
