import Link from "next/link";
import { cn } from "@/lib/utils";

// -- Componentes visuais reutilizáveis ----------------------------------------

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "green" | "red" | "gold";
}) {
  const tones = {
    default: "text-slate-800",
    green: "text-emerald-700",
    red: "text-rose-700",
    gold: "text-amber-600",
  };
  return (
    <Card>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", tones[tone])}>{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </Card>
  );
}

const BADGE_TONES: Record<string, string> = {
  // status financeiro / pix
  confirmado: "bg-emerald-100 text-emerald-800",
  pago: "bg-emerald-100 text-emerald-800",
  pendente: "bg-amber-100 text-amber-800",
  aguardando: "bg-amber-100 text-amber-800",
  cancelado: "bg-slate-200 text-slate-600",
  expirado: "bg-slate-200 text-slate-600",
  // membros
  ativo: "bg-emerald-100 text-emerald-800",
  inativo: "bg-slate-200 text-slate-600",
  visitante: "bg-blue-100 text-blue-800",
  afastado: "bg-amber-100 text-amber-800",
  bloqueado: "bg-rose-100 text-rose-800",
  // presença
  present: "bg-emerald-100 text-emerald-800",
  absent: "bg-rose-100 text-rose-800",
  justified: "bg-amber-100 text-amber-800",
  // oração
  atendido: "bg-emerald-100 text-emerald-800",
  arquivado: "bg-slate-200 text-slate-600",
};

export function Badge({ value, label }: { value: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
        BADGE_TONES[value] ?? "bg-slate-100 text-slate-700"
      )}
    >
      {label ?? value}
    </span>
  );
}

export function EmptyState({ emoji = "🗂️", text }: { emoji?: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="text-3xl mb-2">{emoji}</p>
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
    >
      {children}
    </Link>
  );
}

// -- Campos de formulário (server-action friendly) -----------------------------

export function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-600";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="w-full sm:w-auto rounded-xl bg-blue-700 px-6 py-3 text-base font-semibold text-white hover:bg-blue-800"
    >
      {children}
    </button>
  );
}
