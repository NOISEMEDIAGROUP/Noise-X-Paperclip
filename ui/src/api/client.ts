const BASE = "/api";
const ENVELOPE_HEADER = "x-paperclip-api-envelope";

type ApiEnvelope<T> = {
  trace_id: string;
  code: number;
  message: string;
  data: T;
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

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? undefined);
  const body = init?.body;

  if (!(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set(ENVELOPE_HEADER, "v1");

  const res = await fetch(`${BASE}${path}`, {
    headers,
    credentials: "include",
    ...init,
  });

  if (res.status === 204) {
    return null as T;
  }

  const parsed = await parseBody(res);

  if (!res.ok) {
    if (isApiEnvelope(parsed)) {
      throw new ApiError(parsed.message || `Request failed: ${res.status}`, res.status, parsed);
    }
    const fallbackMessage = isRecord(parsed) && typeof parsed.error === "string"
      ? parsed.error
      : `Request failed: ${res.status}`;
    throw new ApiError(fallbackMessage, res.status, parsed);
  }

  if (isApiEnvelope<T>(parsed)) {
    if (parsed.code !== 0) {
      throw new ApiError(parsed.message || `Request failed: ${res.status}`, res.status, parsed);
    }
    return parsed.data;
  }

  return parsed as T;
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
