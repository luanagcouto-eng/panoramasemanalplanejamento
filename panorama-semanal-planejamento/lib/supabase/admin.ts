import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service_role — bypassa RLS.
 * Uso restrito a server-side (Server Actions / Route Handlers de confiança):
 * sync de perfil pós-login, escrita em audit_logs, etc.
 * NUNCA importar em código que possa ser bundlado para o client.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
