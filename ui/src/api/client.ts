const BASE = "/api";
const NETWORK_BREAKER_BASE_MS = 1_000;
const NETWORK_BREAKER_MAX_MS = 30_000;
const NETWORK_RECOVERY_WINDOW_MS = 20_000;
const NETWORK_RECOVERY_PROBE_INTERVAL_MS = 1_000;

let networkFailureCount = 0;
let networkBreakerOpenUntil = 0;

function computeBreakerDelayMs(failureCount: number): number {
  const exponent = Math.max(0, Math.min(6, failureCount - 1));
  return Math.min(NETWORK_BREAKER_MAX_MS, NETWORK_BREAKER_BASE_MS * 2 ** exponent);
}

function networkBreakerRemainingMs(now = Date.now()): number {
  return Math.max(0, networkBreakerOpenUntil - now);
}

function openNetworkBreakerOnFailure(): number {
  networkFailureCount += 1;
  const delayMs = computeBreakerDelayMs(networkFailureCount);
  networkBreakerOpenUntil = Date.now() + delayMs;
  return delayMs;
}

function resetNetworkBreaker(): void {
  networkFailureCount = 0;
  networkBreakerOpenUntil = 0;
}

function resolveApiPath(path: string): string {
  if (path.startsWith("/api/")) return path;
  if (path === "/api") return path;
  return `${BASE}${path}`;
}

function resolveRequestUrl(apiPath: string): string {
  return typeof window !== "undefined"
    ? new URL(apiPath, window.location.origin).toString()
    : apiPath;
}

export type ApiFetchOptions = {
  // Health probes may bypass the breaker to test recovery.
  bypassNetworkBreaker?: boolean;
};

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveRequestMethod(init?: RequestInit): string {
  const method = init?.method;
  return typeof method === "string" && method.length > 0 ? method.toUpperCase() : "GET";
}

function canAutoRecover(method: string, signal?: AbortSignal): boolean {
  if (signal?.aborted) return false;
  return method === "GET" || method === "HEAD";
}

async function waitForApiRecovery(
  signal?: AbortSignal,
  maxWaitMs = NETWORK_RECOVERY_WINDOW_MS,
): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < maxWaitMs) {
    if (signal?.aborted) return false;
    try {
      const response = await fetch("/api/health", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal,
      });
      if (response.ok) {
        return true;
      }
    } catch {
      // Keep probing until timeout.
    }
    await sleep(NETWORK_RECOVERY_PROBE_INTERVAL_MS);
  }
  return false;
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
  options?: ApiFetchOptions,
): Promise<Response> {
  const apiPath = resolveApiPath(path);
  const requestUrl = resolveRequestUrl(apiPath);
  const method = resolveRequestMethod(init);
  const signal = init?.signal ?? undefined;
  const shouldAutoRecover = canAutoRecover(method, signal);
  const remainingMs = networkBreakerRemainingMs();
  if (!options?.bypassNetworkBreaker && remainingMs > 0) {
    throw new ApiError(
      `Paperclip API is temporarily unreachable. Retrying in ${Math.ceil(remainingMs / 1000)}s.`,
      0,
      { circuitOpen: true, retryAfterMs: remainingMs, path: apiPath, url: requestUrl },
    );
  }

  let res: Response;
  try {
    res = await fetch(apiPath, {
      credentials: "include",
      ...init,
    });
  } catch (err) {
    if (!options?.bypassNetworkBreaker && shouldAutoRecover) {
      const recovered = await waitForApiRecovery(signal);
      if (recovered) {
        try {
          res = await fetch(apiPath, {
            credentials: "include",
            ...init,
          });
          resetNetworkBreaker();
          return res;
        } catch {
          // Fall through to breaker + surfaced error.
        }
      }
    }
    const retryAfterMs = openNetworkBreakerOnFailure();
    const reason = err instanceof Error ? err.message : String(err);
    throw new ApiError(
      `Network error while requesting ${requestUrl}. Verify that the Paperclip server is reachable.`,
      0,
      { reason, path: apiPath, url: requestUrl, retryAfterMs },
    );
  }
  resetNetworkBreaker();
  return res;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? undefined);
  const body = init?.body;
  if (!(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await apiFetch(path, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new ApiError(
      (errorBody as { error?: string } | null)?.error ?? `Request failed: ${res.status}`,
      res.status,
      errorBody,
    );
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  postForm: <T>(path: string, body: FormData) =>
    request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
