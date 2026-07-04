"use server";

import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { requireRole, auditLog } from "@/lib/session";

function get(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  return v === null || v === "" ? null : String(v);
}

export async function updateSettings(fd: FormData) {
  const user = await requireRole("admin");
  const db = adminClient();

  const { error } = await db
    .from("rcc_settings")
    .update({
      group_name: get(fd, "group_name") ?? "RCC Grupo Daniel",
      pix_key: get(fd, "pix_key"),
      pix_merchant_name: get(fd, "pix_merchant_name"),
      pix_merchant_city: get(fd, "pix_merchant_city"),
      meeting_weekday: get(fd, "meeting_weekday"),
      meeting_place: get(fd, "meeting_place"),
      moderate_prayers: fd.get("moderate_prayers") === "on",
    })
    .eq("id", 1);
  if (error) throw new Error(error.message);

  await auditLog(user.id, "update", "settings", null);
  revalidatePath("/configuracoes");
}
