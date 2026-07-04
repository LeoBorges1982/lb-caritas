import QRCode from "qrcode";
import { initials, STATUS_MEMBRO, formatDate } from "@/lib/utils";

type Member = {
  id: string;
  full_name: string;
  role_in_group: string | null;
  ministry: string | null;
  cell_group: string | null;
  status: string;
  joined_at: string | null;
};

// Cartão de membro digital — QR Code contém o identificador do membro
export default async function MemberCard({ member }: { member: Member }) {
  const qr = await QRCode.toDataURL(`rcc-grupo-daniel:member:${member.id}`, {
    margin: 1,
    width: 160,
    color: { dark: "#1e3a8a", light: "#ffffff" },
  });

  return (
    <div className="mx-auto max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-blue-800 via-blue-700 to-blue-900 text-white shadow-xl">
      <div className="flex items-center justify-between px-6 pt-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-blue-200">Renovação Carismática Católica</p>
          <p className="text-lg font-bold text-amber-300">RCC Grupo Daniel</p>
        </div>
        <span className="text-2xl">🕊️</span>
      </div>

      <div className="flex items-center gap-4 px-6 py-5">
        <div className="h-16 w-16 shrink-0 rounded-full bg-white/15 border-2 border-amber-300 flex items-center justify-center text-xl font-bold">
          {initials(member.full_name)}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-base leading-tight">{member.full_name}</p>
          <p className="text-sm text-blue-200">
            {[member.role_in_group, member.ministry || member.cell_group].filter(Boolean).join(" · ") || "Membro"}
          </p>
          <p className="text-xs text-blue-300 mt-0.5">
            {STATUS_MEMBRO[member.status]}
            {member.joined_at ? ` · desde ${formatDate(member.joined_at, "MM/yyyy")}` : ""}
          </p>
        </div>
      </div>

      <div className="bg-white/95 px-6 py-4 flex items-center justify-between gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="QR Code do membro" className="h-24 w-24 rounded-lg" />
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Identificador</p>
          <p className="font-mono text-xs text-slate-600 break-all">{member.id.slice(0, 13)}…</p>
          <p className="text-[10px] text-slate-400 mt-2">
            “Servi ao Senhor com alegria” — Sl 100,2
          </p>
        </div>
      </div>
    </div>
  );
}
