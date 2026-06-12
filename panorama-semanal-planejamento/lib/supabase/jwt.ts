import { SignJWT } from "jose";

/**
 * Assina um access token compativel com o GoTrue do Supabase (HS256,
 * mesmo segredo das chaves anon/service_role do projeto), permitindo que
 * `auth.uid()` resolva para `profiles.id` nas policies de RLS mesmo sem
 * o usuario passar pelo fluxo nativo do Supabase Auth.
 *
 * Ver decisao arquitetural: sync NextAuth (Entra ID) -> auth.users.
 */
export async function createSupabaseAccessToken(userId: string, email: string) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error("SUPABASE_JWT_SECRET nao configurado");
  }

  return new SignJWT({
    email,
    role: "authenticated",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
}
