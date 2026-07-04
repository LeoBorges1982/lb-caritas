"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/session";

function get(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  return v === null || v === "" ? null : String(v);
}

export async function createMeeting(fd: FormData) {
  const user = await requireRole("admin", "lider");
  const db = adminClient();

  const title = get(fd, "title");
  const date = get(fd, "date");
  if (!title || !date) throw new Error("Título e data são obrigatórios.");

  const cellGroup = get(fd, "cell_group");
  // líder só cria reuniões dos grupos autorizados
  if (user.role === "lider" && user.led_groups.length > 0) {
    if (cellGroup && !user.led_groups.includes(cellGroup)) {
      throw new Error("Você só pode registrar reuniões das células/ministérios que acompanha.");
    }
  }

  const { data, error } = await db
    .from("rcc_attendance_meetings")
    .insert({
      title,
      type: get(fd, "type") ?? "grupo_oracao",
      date,
      time: get(fd, "time"),
      location: get(fd, "location"),
      cell_group: cellGroup,
      leader_id: user.id,
      notes: get(fd, "notes"),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/frequencia");
  redirect(`/frequencia/${data.id}`);
}

// Registro rápido: um submit com todos os checkboxes/valores
export async function saveAttendance(meetingId: string, fd: FormData) {
  await requireRole("admin", "lider");
  const db = adminClient();

  const visitors = Number(fd.get("visitors_count") || 0);
  await db
    .from("rcc_attendance_meetings")
    .update({ visitors_count: Number.isFinite(visitors) ? visitors : 0 })
    .eq("id", meetingId);

  const records: { meeting_id: string; member_id: string; status: string }[] = [];
  for (const [key, value] of fd.entries()) {
    if (key.startsWith("status_")) {
      const memberId = key.slice("status_".length);
      const status = String(value);
      if (["present", "absent", "justified"].includes(status)) {
        records.push({ meeting_id: meetingId, member_id: memberId, status });
      }
    }
  }

  if (records.length > 0) {
    const { error } = await db
      .from("rcc_attendance_records")
      .upsert(records, { onConflict: "meeting_id,member_id" });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/frequencia/${meetingId}`);
  revalidatePath("/frequencia");
  redirect(`/frequencia/${meetingId}?ok=1`);
}
