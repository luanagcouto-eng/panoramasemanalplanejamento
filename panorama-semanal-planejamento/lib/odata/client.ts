import { getODataAccessToken } from "./token";

/** ISR padrao para dados do PWA: 15 minutos (ver project_master_prompt, Fase 2) */
const REVALIDATE_SECONDS = 900;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

export interface ODataQueryOptions {
  select?: string[];
  filter?: string;
  top?: number;
  orderby?: string;
  expand?: string[];
  /** Override do ISR (segundos) ou `false` para nao cachear */
  revalidate?: number | false;
}

export interface ODataCollection<T> {
  d: {
    results: T[];
  };
}

function getPwaBaseUrl(): string {
  const baseUrl = process.env.SHAREPOINT_PWA_BASE_URL;
  if (!baseUrl) {
    throw new Error("Variavel de ambiente SHAREPOINT_PWA_BASE_URL nao configurada");
  }
  return baseUrl.replace(/\/$/, "");
}

function buildQueryString(options: ODataQueryOptions): string {
  const params = new URLSearchParams();
  if (options.select?.length) params.set("$select", options.select.join(","));
  if (options.filter) params.set("$filter", options.filter);
  if (options.top !== undefined) params.set("$top", String(options.top));
  if (options.orderby) params.set("$orderby", options.orderby);
  if (options.expand?.length) params.set("$expand", options.expand.join(","));

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function odataFetch(path: string, revalidate: number | false): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const token = await getODataAccessToken();
      const response = await fetch(`${getPwaBaseUrl()}${path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json;odata=verbose",
        },
        next: revalidate === false ? undefined : { revalidate },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Requisicao OData falhou (${response.status} ${path}): ${body}`);
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_BASE_DELAY_MS * 2 ** attempt);
      }
    }
  }

  throw lastError;
}

/**
 * Busca um entity set do feed ProjectData (ex: "Projects", "Tasks", "Assignments").
 * Use `getMetadata()` para descobrir os entity sets disponiveis no tenant.
 */
export async function getEntitySet<T>(
  entitySet: string,
  options: ODataQueryOptions = {},
): Promise<T[]> {
  const path = `/_api/ProjectData/${entitySet}${buildQueryString(options)}`;
  const response = await odataFetch(path, options.revalidate ?? REVALIDATE_SECONDS);
  const data = (await response.json()) as ODataCollection<T>;
  return data.d.results;
}

/** Retorna o XML de `$metadata` do feed ProjectData, para introspeccao de entidades. */
export async function getMetadata(revalidate: number | false = REVALIDATE_SECONDS): Promise<string> {
  const response = await odataFetch("/_api/ProjectData/$metadata", revalidate);
  return response.text();
}
