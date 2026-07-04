import { createClient } from "@supabase/supabase-js";

// Client com service role — uso exclusivo em server actions / route handlers.
// As permissões por perfil são verificadas na camada de aplicação (lib/session).
export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
