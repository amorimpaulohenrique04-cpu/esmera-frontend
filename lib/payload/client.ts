import {
  isSupportedStorefrontContractVersion,
  STOREFRONT_CONTRACT_HEADER,
  STOREFRONT_CONTRACT_VERSION,
} from "./contract/version.ts";
import { PayloadAPIError } from "./errors.ts";
import { buildPayloadQuery, type QueryOptions } from "./query.ts";

const DEFAULT_PAYLOAD_API_URL = "https://esmeracms-green.vercel.app";
const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_TRANSIENT_RETRIES = 1;

const inFlightRequests = new Map<string, Promise<unknown>>();
const fetcherIDs = new WeakMap<object, number>();
let nextFetcherID = 1;

export interface PayloadRequestOptions extends QueryOptions {
  timeoutMs?: number;
  maxRetries?: number;
  fetcher?: typeof fetch;
  cache?: RequestCache;
  dedupe?: boolean;
}

export interface PayloadClientOptions extends PayloadRequestOptions {
  baseURL?: string;
}

export interface PayloadClientConfig {
  baseURL?: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetcher?: typeof fetch;
  cache?: RequestCache;
  dedupe?: boolean;
}

export interface PayloadClient {
  get<T>(path: string, options?: PayloadRequestOptions): Promise<T>;
}

export function normalizePayloadBaseURL(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new PayloadAPIError(
      "configuration",
      "PAYLOAD_API_URL deve ser uma URL HTTPS válida.",
    );
  }
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    throw new PayloadAPIError(
      "configuration",
      "PAYLOAD_API_URL deve usar HTTPS.",
    );
  }
  if (parsed.pathname !== "/") {
    throw new PayloadAPIError(
      "configuration",
      "PAYLOAD_API_URL não deve incluir /api nem outro caminho.",
    );
  }
  return parsed.origin;
}

export function getPayloadBaseURL(): string {
  return normalizePayloadBaseURL(
    Deno.env.get("PAYLOAD_API_URL") || DEFAULT_PAYLOAD_API_URL,
  );
}

function normalizeEndpoint(path: string): string {
  const endpoint = path.trim().replace(/^\/+/, "");
  const segments = endpoint.split("/");
  if (
    !endpoint ||
    endpoint.includes("?") ||
    endpoint.includes("#") ||
    endpoint.includes("\\") ||
    segments.some((segment) => segment === "." || segment === "..")
  ) {
    throw new PayloadAPIError(
      "configuration",
      "O endpoint do Payload deve ser um caminho relativo válido.",
    );
  }
  return endpoint;
}

function getFetcherID(fetcher: typeof fetch): number {
  const key = fetcher as unknown as object;
  const current = fetcherIDs.get(key);
  if (current !== undefined) return current;
  const id = nextFetcherID++;
  fetcherIDs.set(key, id);
  return id;
}

function requestKey(
  url: URL,
  options: PayloadClientOptions,
  fetcher: typeof fetch,
): string {
  return [
    url.href,
    `cache=${options.cache ?? "default"}`,
    `timeout=${options.timeoutMs ?? DEFAULT_TIMEOUT_MS}`,
    `retries=${options.maxRetries ?? MAX_TRANSIENT_RETRIES}`,
    `contract=${STOREFRONT_CONTRACT_VERSION}`,
    `fetcher=${getFetcherID(fetcher)}`,
  ].join("|");
}

function transientStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status === 500 ||
    status === 502 || status === 503 || status === 504;
}

function retryDelay(attempt: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 180 * (attempt + 1)));
}

function logRetry(
  endpoint: string,
  attempt: number,
  reason: "network" | "timeout" | "http",
  status?: number,
) {
  console.warn(JSON.stringify({
    event: "payload_get_retry",
    endpoint,
    attempt: attempt + 1,
    reason,
    status: status ?? null,
    contractVersion: STOREFRONT_CONTRACT_VERSION,
  }));
}

async function executePayloadGet<T>(
  url: URL,
  endpoint: string,
  options: PayloadClientOptions,
  fetcher: typeof fetch,
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? MAX_TRANSIENT_RETRIES;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new PayloadAPIError(
      "configuration",
      `O timeout do cliente Payload é inválido para ${endpoint}.`,
      undefined,
      endpoint,
    );
  }

  if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 3) {
    throw new PayloadAPIError(
      "configuration",
      `A quantidade de retries do cliente Payload é inválida para ${endpoint}.`,
      undefined,
      endpoint,
    );
  }

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;

    try {
      response = await fetcher(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          [STOREFRONT_CONTRACT_HEADER]: STOREFRONT_CONTRACT_VERSION,
        },
        signal: controller.signal,
        cache: options.cache,
      });
    } catch {
      const timedOut = controller.signal.aborted;
      clearTimeout(timeout);
      if (attempt < maxRetries) {
        logRetry(endpoint, attempt, timedOut ? "timeout" : "network");
        await retryDelay(attempt);
        continue;
      }
      throw new PayloadAPIError(
        timedOut ? "timeout" : "network",
        timedOut
          ? `A API de conteúdo excedeu o tempo limite em ${endpoint}.`
          : `Não foi possível alcançar a API de conteúdo em ${endpoint}.`,
        undefined,
        endpoint,
      );
    }

    clearTimeout(timeout);
    if (!response.ok) {
      if (attempt < maxRetries && transientStatus(response.status)) {
        logRetry(endpoint, attempt, "http", response.status);
        await retryDelay(attempt);
        continue;
      }
      throw new PayloadAPIError(
        "http",
        `A API de conteúdo respondeu HTTP ${response.status} em ${endpoint}.`,
        response.status,
        endpoint,
      );
    }

    const responseVersion = response.headers.get(STOREFRONT_CONTRACT_HEADER);
    if (
      responseVersion &&
      !isSupportedStorefrontContractVersion(responseVersion)
    ) {
      throw new PayloadAPIError(
        "invalid-response",
        `A API respondeu com contrato incompatível em ${endpoint}.`,
        response.status,
        endpoint,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      throw new PayloadAPIError(
        "invalid-response",
        `A API de conteúdo não retornou JSON em ${endpoint}.`,
        response.status,
        endpoint,
      );
    }

    try {
      return await response.json() as T;
    } catch {
      throw new PayloadAPIError(
        "invalid-response",
        `A API de conteúdo retornou JSON inválido em ${endpoint}.`,
        response.status,
        endpoint,
      );
    }
  }

  throw new PayloadAPIError(
    "network",
    `Não foi possível alcançar a API de conteúdo em ${endpoint}.`,
    undefined,
    endpoint,
  );
}

export async function payloadGet<T>(
  path: string,
  options: PayloadClientOptions = {},
): Promise<T> {
  if ("document" in globalThis) {
    throw new PayloadAPIError(
      "configuration",
      "O cliente Payload só pode ser executado no servidor.",
    );
  }

  const baseURL = options.baseURL
    ? normalizePayloadBaseURL(options.baseURL)
    : getPayloadBaseURL();
  const relativeEndpoint = normalizeEndpoint(path);
  const endpoint = `/api/${relativeEndpoint}`;
  const url = new URL(endpoint, baseURL);
  url.search = buildPayloadQuery(options).toString();
  const fetcher = options.fetcher ?? fetch;

  const execute = () => executePayloadGet<T>(url, endpoint, options, fetcher);
  if (options.dedupe === false) return await execute();

  const key = requestKey(url, options, fetcher);
  const existing = inFlightRequests.get(key) as Promise<T> | undefined;
  if (existing) return await existing;

  const request = execute();
  inFlightRequests.set(key, request);
  try {
    return await request;
  } finally {
    if (inFlightRequests.get(key) === request) inFlightRequests.delete(key);
  }
}

export function createPayloadClient(
  config: PayloadClientConfig = {},
): PayloadClient {
  const baseURL = config.baseURL
    ? normalizePayloadBaseURL(config.baseURL)
    : undefined;

  return {
    get<T>(path: string, options: PayloadRequestOptions = {}) {
      return payloadGet<T>(path, {
        baseURL,
        timeoutMs: options.timeoutMs ?? config.timeoutMs,
        maxRetries: options.maxRetries ?? config.maxRetries,
        fetcher: options.fetcher ?? config.fetcher,
        cache: options.cache ?? config.cache,
        dedupe: options.dedupe ?? config.dedupe,
        depth: options.depth,
        limit: options.limit,
        page: options.page,
        sort: options.sort,
        where: options.where,
      });
    },
  };
}
