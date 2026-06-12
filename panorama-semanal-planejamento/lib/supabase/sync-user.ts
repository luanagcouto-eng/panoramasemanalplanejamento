import { createAdminClient } from "./admin";

interface SyncEntraUserParams {
  email: string;
  name?: string | null;
  image?: string | null;
}

/**
 * Garante que um usuario autenticado via Microsoft Entra ID tenha um
 * registro correspondente em `auth.users` + `profiles` no Supabase,
 * necessario para que `profiles.id` seja usado como `auth.uid()` nas
 * policies de RLS.
 *
 * Chamado a partir do callback `jwt` do NextAuth no primeiro login.
 */
export async function syncEntraUserToSupabase({
  email,
  name,
  image,
}: SyncEntraUserParams): Promise<string> {
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
    role: "viewer",
  });

  return data.user.id;
}
