import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(n: number | null | undefined): string {
  const v = typeof n === "number" ? n : 0;
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

export function formatDate(d: string | Date | null | undefined, fmt = "dd/MM/yyyy"): string {
  if (!d) return "—";
  const date = typeof d === "string" ? parseISO(d) : d;
  return format(date, fmt, { locale: ptBR });
}

export function formatTime(t: string | null | undefined): string {
  if (!t) return "";
  return t.slice(0, 5);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// "1.234,56" ou "1234.56" → número
export function parseMoney(v: string | null): number | null {
  if (!v) return null;
  const clean = v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

// Idade a partir da data de nascimento
export function age(birth: string | null | undefined): number | null {
  if (!birth) return null;
  const b = parseISO(birth);
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return a;
}

// Aniversário no mês corrente?
export function isBirthdayMonth(birth: string | null | undefined, month?: number): boolean {
  if (!birth) return false;
  const m = month ?? new Date().getMonth() + 1;
  return Number(birth.slice(5, 7)) === m;
}

export function isBirthdayToday(birth: string | null | undefined): boolean {
  if (!birth) return false;
  const now = new Date();
  return (
    Number(birth.slice(5, 7)) === now.getMonth() + 1 &&
    Number(birth.slice(8, 10)) === now.getDate()
  );
}

export const CATEGORIAS_RECEITA: Record<string, string> = {
  dizimo: "Dízimo",
  oferta: "Oferta",
  doacao: "Doação",
  evento: "Evento",
  campanha: "Campanha",
  venda: "Venda simples",
  outro: "Outro",
};

export const CATEGORIAS_DESPESA: Record<string, string> = {
  evento: "Evento",
  material: "Material",
  caridade: "Caridade",
  alimentacao: "Alimentação",
  transporte: "Transporte",
  aluguel: "Aluguel",
  manutencao: "Manutenção",
  comunicacao: "Comunicação",
  outro: "Outro",
};

export const FORMAS_PAGAMENTO: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  transferencia: "Transferência",
  outro: "Outro",
};

export const TIPOS_EVENTO: Record<string, string> = {
  grupo_oracao: "Grupo de Oração",
  celula: "Célula",
  retiro: "Retiro",
  seminario: "Seminário",
  formacao: "Formação",
  reuniao_interna: "Reunião interna",
  outro: "Outro",
};

export const TIPOS_CONTRIBUICAO: Record<string, string> = {
  dizimo: "Dízimo",
  oferta: "Oferta",
  campanha: "Campanha",
  doacao: "Doação",
};

export const TIPOS_AVISO: Record<string, string> = {
  comunicado: "Comunicado oficial",
  pedido_oracao: "Pedido de oração",
  escala: "Escala",
  convite: "Convite para evento",
  campanha: "Campanha",
  financeiro: "Aviso financeiro",
  formacao: "Formação",
};

export const CATEGORIAS_ORACAO: Record<string, string> = {
  saude: "Saúde",
  familia: "Família",
  trabalho: "Trabalho",
  espiritual: "Espiritual",
  agradecimento: "Agradecimento",
  outro: "Outro",
};

export const STATUS_MEMBRO: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  visitante: "Visitante",
  afastado: "Afastado",
};

export const ROLES: Record<string, string> = {
  admin: "Coordenador (Admin)",
  tesoureiro: "Tesoureiro",
  lider: "Líder",
  membro: "Membro",
};
