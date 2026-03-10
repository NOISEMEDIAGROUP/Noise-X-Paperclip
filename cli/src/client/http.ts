import { URL } from "node:url";

const ENVELOPE_HEADER = "x-paperclip-api-envelope";

type ApiEnvelope<T> = {
  trace_id: string;
  code: number;
  message: string;
  data: T;
};

export class ApiRequestError extends Error {
  status: number;
  details?: unknown;
  body?: unknown;

  constructor(status: number, message: string, details?: unknown, body?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
    this.body = body;
  }
}

interface RequestOptions {
  ignoreNotFound?: boolean;
}

interface ApiClientOptions {
  apiBase: string;
  apiKey?: string;
  runId?: string;
}

export class PaperclipApiClient {
  readonly apiBase: string;
  readonly apiKey?: string;
  readonly runId?: string;

  constructor(opts: ApiClientOptions) {
    this.apiBase = opts.apiBase.replace(/\/+$/, "");
    this.apiKey = opts.apiKey?.trim() || undefined;
    this.runId = opts.runId?.trim() || undefined;
  }

  get<T>(path: string, opts?: RequestOptions): Promise<T | null> {
    return this.request<T>(path, { method: "GET" }, opts);
  }

  post<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T | null> {
    return this.request<T>(
      path,
      {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      opts,
    );
  }

  patch<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T | null> {
    return this.request<T>(
      path,
      {
        method: "PATCH",
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      opts,
    );
  }

  delete<T>(path: string, opts?: RequestOptions): Promise<T | null> {
    return this.request<T>(path, { method: "DELETE" }, opts);
  }

  private async request<T>(path: string, init: RequestInit, opts?: RequestOptions): Promise<T | null> {
    const url = buildUrl(this.apiBase, path);

    const headers: Record<string, string> = {
      accept: "application/json",
      [ENVELOPE_HEADER]: "v1",
      ...toStringRecord(init.headers),
    };

    if (init.body !== undefined) {
      headers["content-type"] = headers["content-type"] ?? "application/json";
    }

    if (this.apiKey) {
      headers.authorization = `Bearer ${this.apiKey}`;
    }

    if (this.runId) {
      headers["x-paperclip-run-id"] = this.runId;
    }

    const response = await fetch(url, {
      ...init,
      headers,
    });

    if (opts?.ignoreNotFound && response.status === 404) {
      return null;
    }

    const parsedBody = await readBody(response);

    if (!response.ok) {
      throw toApiError(response.status, parsedBody);
    }

    if (response.status === 204 || parsedBody == null) {
      return null;
    }

    if (isApiEnvelope<T>(parsedBody)) {
      if (parsedBody.code !== 0) {
        throw new ApiRequestError(response.status, parsedBody.message || `Request failed with status ${response.status}`, parsedBody.data, parsedBody);
      }
      return parsedBody.data;
    }

    return parsedBody as T;
  }
}

function buildUrl(apiBase: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const [pathname, query] = normalizedPath.split("?");
  const url = new URL(apiBase);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}${pathname}`;
  if (query) url.search = query;
  return url.toString();
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;
  return safeParseJson(text);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  if (!isRecord(value)) return false;
  return (
    typeof value.trace_id === "string" &&
    typeof value.code === "number" &&
    typeof value.message === "string" &&
    Object.prototype.hasOwnProperty.call(value, "data")
  );
}

function toApiError(status: number, parsed: unknown): ApiRequestError {
  if (isApiEnvelope(parsed)) {
    return new ApiRequestError(status, parsed.message || `Request failed with status ${status}`, parsed.data, parsed);
  }

  if (isRecord(parsed)) {
    const message =
      (typeof parsed.error === "string" && parsed.error.trim()) ||
      (typeof parsed.message === "string" && parsed.message.trim()) ||
      `Request failed with status ${status}`;

    return new ApiRequestError(status, message, parsed.details, parsed);
  }

  return new ApiRequestError(status, `Request failed with status ${status}`, undefined, parsed);
}

function toStringRecord(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {};
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers.map(([key, value]) => [key, String(value)]));
  }
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, String(value)]));
}
