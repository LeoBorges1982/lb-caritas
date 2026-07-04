"use server";

import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/session";

function get(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  return v === null || v === "" ? null : String(v);
}

// Membro edita apenas o próprio perfil (campos de contato — os demais são
// bloqueados pela administração)
export async function updateOwnProfile(fd: FormData) {
  const user = await requireRole();
  const db = adminClient();

  const name = get(fd, "name");
  if (name) {
    await db.from("rcc_users").update({ name, phone: get(fd, "phone") }).eq("id", user.id);
  }

  if (user.member_id) {
    await db
      .from("rcc_members")
      .update({
        phone: get(fd, "phone"),
        whatsapp: get(fd, "whatsapp"),
        address: get(fd, "address"),
      })
      .eq("id", user.member_id);
  }

  revalidatePath("/perfil");
}
