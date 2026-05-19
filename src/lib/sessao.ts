/**
 * Validação de sessão SSO via Portal LB.
 * Cookie HMAC-assinado, compatível com Edge Runtime (Web Crypto API).
 */
import { cookies } from "next/headers";
import { SISTEMA_CODIGO } from "@/lib/constants";

const PORTAL_SECRET = process.env.PORTAL_SECRET || "";
const COOKIE_NAME = "lb_caritas_session";

function b64urlDecodeToBytes(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function hmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return bytesToB64url(sig);
}

export interface Sessao {
  sub: string;
  email: string;
  nome?: string;
  exp: number;
}

export async function criarSessaoCookie(payload: { sub: string; email: string; nome?: string }): Promise<string> {
  const data = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
  };
  const corpo = bytesToB64url(new TextEncoder().encode(JSON.stringify(data)).buffer);
  const assinatura = await hmacSha256(PORTAL_SECRET, corpo);
  return `${corpo}.${assinatura}`;
}

export async function validarSessaoToken(raw: string): Promise<Sessao | null> {
  if (!PORTAL_SECRET || !raw) return null;
  try {
    const partes = raw.split(".");
    if (partes.length !== 2) return null;
    const [corpo, assinatura] = partes;
    const esperado = await hmacSha256(PORTAL_SECRET, corpo);
    if (assinatura !== esperado) return null;
    const json = new TextDecoder().decode(b64urlDecodeToBytes(corpo));
    const data = JSON.parse(json) as Sessao;
    if (typeof data.exp !== "number" || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getSessao(): Promise<Sessao | null> {
  if (!PORTAL_SECRET) return null;
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return validarSessaoToken(raw);
}

/**
 * Valida JWT recebido do Portal (assinado com PORTAL_SECRET, payload tem sis="caritas").
 */
export async function validarJWTPortal(token: string): Promise<{ sub: string; email: string; nome?: string } | null> {
  if (!PORTAL_SECRET || !token) return null;
  try {
    const partes = token.split(".");
    if (partes.length !== 3) return null;
    const [h, p, sig] = partes;
    const esperado = await hmacSha256(PORTAL_SECRET, `${h}.${p}`);
    if (sig !== esperado) return null;
    const json = new TextDecoder().decode(b64urlDecodeToBytes(p));
    const payload = JSON.parse(json);
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.sis !== SISTEMA_CODIGO) return null;
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      nome: payload.nome ? String(payload.nome) : undefined,
    };
  } catch {
    return null;
  }
}
