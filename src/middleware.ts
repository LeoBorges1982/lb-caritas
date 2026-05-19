import { NextResponse, type NextRequest } from "next/server";
import { validarSessaoToken } from "@/lib/sessao";

const PORTAL_URL = process.env.PORTAL_URL || "https://portal.leoborgescontador.com.br";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Públicos: SSO entry, assets, webhooks
  if (
    path === "/auth-via-portal" ||
    path === "/login" ||
    path.startsWith("/api/webhooks/") ||
    path.startsWith("/_next") ||
    path === "/favicon.ico" ||
    path === "/logo-lb.png"
  ) {
    return NextResponse.next();
  }

  const raw = req.cookies.get("lb_caritas_session")?.value;
  const sessao = raw ? await validarSessaoToken(raw) : null;

  if (!sessao) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
