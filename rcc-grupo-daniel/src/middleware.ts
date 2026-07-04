import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login", "/cadastro", "/recuperar-senha", "/aguardando-aprovacao"];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Públicos: auth, webhooks, assets
  if (
    PUBLIC_PATHS.includes(path) ||
    path.startsWith("/api/webhooks/") ||
    path.startsWith("/auth/") ||
    path.startsWith("/_next") ||
    path === "/favicon.ico" ||
    path === "/manifest.webmanifest" ||
    path === "/icon.svg"
  ) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(req);

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
