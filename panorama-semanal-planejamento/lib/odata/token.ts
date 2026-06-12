/**
 * Autenticacao app-only (client credentials) para acesso ao PWA via OData.
 * Credencial Entra ID separada do login (decisao #9): nao depende do usuario logado.
 */

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variavel de ambiente ${name} nao configurada`);
  }
  return value;
}

export async function getODataAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) {
    return cachedToken.accessToken;
  }

  const tenantId = getEnv("AZURE_AD_TENANT_ID");
  const clientId = getEnv("AZURE_AD_CLIENT_ID");
  const clientSecret = getEnv("AZURE_AD_CLIENT_SECRET");
  const pwaBaseUrl = getEnv("SHAREPOINT_PWA_BASE_URL");

  const sharePointHost = new URL(pwaBaseUrl).host;
  const scope = `https://${sharePointHost}/.default`;

  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao obter token Entra ID app-only (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return cachedToken.accessToken;
}
