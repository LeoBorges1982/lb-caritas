"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/session";

function get(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  return v === null || v === "" ? null : String(v);
}

export async function createEvent(fd: FormData) {
  const user = await requireRole("admin", "lider");
  const db = adminClient();

  const title = get(fd, "title");
  const date = get(fd, "date");
  if (!title || !date) throw new Error("Título e data são obrigatórios.");

  const { error } = await db.from("rcc_events").insert({
    title,
    type: get(fd, "type") ?? "grupo_oracao",
    description: get(fd, "description"),
    date,
    start_time: get(fd, "start_time"),
    end_time: get(fd, "end_time"),
    location: get(fd, "location"),
    responsible_id: user.id,
    notify_members: fd.get("notify_members") === "on",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  redirect("/agenda");
}

export async function deleteEvent(id: string) {
  await requireRole("admin");
  const db = adminClient();
  const { error } = await db.from("rcc_events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}
