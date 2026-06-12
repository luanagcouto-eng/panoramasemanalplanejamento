import { createAdminClient } from "./admin";

interface SyncUserParams {
  email: string;
  name?: string | null;
  image?: string | null;
  role: "admin" | "planner" | "viewer";
}

/**
 * Garante que um usuario autenticado (Google + allowlist) tenha um
 * registro correspondente em `auth.users` + `profiles` no Supabase,
 * necessario para que `profiles.id` seja usado como `auth.uid()` nas
 * policies de RLS.
 *
 * Chamado a partir do callback `jwt` do NextAuth no primeiro login,
 * apos o callback `signIn` confirmar que o e-mail esta na allowlist.
 */
export async function syncUserToSupabase({
  email,
  name,
  image,
  role,
}: SyncUserParams): Promise<string> {
  const supabase = createAdminClient();

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    await supabase
      .from("profiles")
      .update({ full_name: name ?? null, avatar_url: image ?? null })
      .eq("id", existingProfile.id);

    return existingProfile.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: name, avatar_url: image },
  });

  if (error || !data.user) {
    throw new Error(`Falha ao criar usuario Supabase: ${error?.message}`);
  }

  await supabase.from("profiles").insert({
    id: data.user.id,
    email,
    full_name: name ?? null,
    avatar_url: image ?? null,
    role,
  });

  return data.user.id;
}
