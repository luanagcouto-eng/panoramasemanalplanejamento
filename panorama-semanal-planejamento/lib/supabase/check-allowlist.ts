import { createAdminClient } from "./admin";

interface AllowlistEntry {
  allowed: boolean;
  role?: "admin" | "planner" | "viewer";
}

/**
 * Verifica se um e-mail esta autorizado a fazer login (tabela `allowed_emails`).
 * Login via Google nao restringe automaticamente por organizacao, diferente
 * do Entra ID — por isso o acesso e controlado por esta allowlist.
 */
export async function checkAllowlist(email: string): Promise<AllowlistEntry> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("allowed_emails")
    .select("role")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (!data) {
    return { allowed: false };
  }

  return { allowed: true, role: data.role };
}
