import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { auth } from "@/auth";

/**
 * Cliente Supabase para uso em Server Components / Server Actions.
 *
 * Autentica as requisicoes com o token assinado a partir da sessao
 * NextAuth (ver lib/supabase/jwt.ts e lib/supabase/sync-user.ts), de
 * forma que `auth.uid()` resolva para `profiles.id` e as policies de
 * RLS sejam aplicadas normalmente. Sem sessao, o client opera como
 * usuario anonimo (role `anon`).
 */
export async function createClient() {
  const session = await auth();

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: session?.supabaseAccessToken
        ? { headers: { Authorization: `Bearer ${session.supabaseAccessToken}` } }
        : undefined,
    }
  );
}
