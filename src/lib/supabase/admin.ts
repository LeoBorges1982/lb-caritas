import { createClient } from "@supabase/supabase-js";

/** Cliente admin com service_role — usado em rotas server-side, bypassa RLS. */
export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
