import { NextRequest, NextResponse } from "next/server";
import { validarJWTPortal, criarSessaoCookie } from "@/lib/sessao";

const PORTAL_URL = process.env.PORTAL_URL || "https://portal.leoborgescontador.com.br";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || ".leoborgescontador.com.br";

async function handleAuth(token: string, next: string = "/") {
  const payload = await validarJWTPortal(token);
  if (!payload) {
    console.error("[caritas/auth-via-portal] JWT invalido");
    return NextResponse.redirect(PORTAL_URL);
  }

  const cookie = await criarSessaoCookie(payload);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://caritas.leoborgescontador.com.br";
  const safeNext = next.startsWith("/") ? next : "/";

  const res = NextResponse.redirect(`${siteUrl}${safeNext}`);
  res.cookies.set("lb_caritas_session", cookie, {
    domain: COOKIE_DOMAIN,
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 12 * 3600,
  });
  return res;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const next = req.nextUrl.searchParams.get("next") || "/";
  if (!token) return NextResponse.redirect(PORTAL_URL);
  return handleAuth(token, next);
}

export async function POST(req: NextRequest) {
  let token = "";
  const ct = req.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      const body = await req.json();
      token = body.token || "";
    } else {
      const fd = await req.formData();
      token = (fd.get("token") || "").toString();
    }
  } catch {
    return NextResponse.redirect(PORTAL_URL);
  }
  return handleAuth(token);
}
