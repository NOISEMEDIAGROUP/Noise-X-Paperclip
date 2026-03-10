import type { Request, RequestHandler, Response } from "express";

interface ApiEnvelope<T> {
  trace_id: string;
  code: number;
  message: string;
  data: T;
}

const ENVELOPE_HEADER = "x-paperclip-api-envelope";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  if (!isRecord(value)) return false;
  return (
    typeof value.trace_id === "string" &&
    typeof value.code === "number" &&
    typeof value.message === "string" &&
    Object.prototype.hasOwnProperty.call(value, "data")
  );
}

function shouldUseEnvelope(req: Request): boolean {
  if (!req.path.startsWith("/api")) return false;
  const raw = req.header(ENVELOPE_HEADER)?.trim().toLowerCase();
  if (raw === "v1" || raw === "true") return true;
  return process.env.PAPERCLIP_API_ENVELOPE_DEFAULT === "true";
}

function resolveTraceId(req: Request, res: Response): string {
  if (req.traceId) return req.traceId;
  const headerValue = res.getHeader("x-trace-id");
  if (typeof headerValue === "string" && headerValue.trim()) return headerValue.trim();
  return "unknown";
}

export function apiEnvelopeMiddleware(): RequestHandler {
  return (req, res, next) => {
    if (!req.path.startsWith("/api")) {
      next();
      return;
    }

    const originalJson = res.json.bind(res);

    res.json = ((body?: unknown) => {
      if ((res.locals as Record<string, unknown>).skipApiEnvelope === true || !shouldUseEnvelope(req)) {
        return originalJson(body);
      }

      if (isApiEnvelope(body)) {
        return originalJson(body);
      }

      const traceId = resolveTraceId(req, res);

      if (res.statusCode >= 400) {
        const asRecord = isRecord(body) ? body : null;
        const code = typeof asRecord?.code === "number" ? asRecord.code : res.statusCode;
        const message =
          (typeof asRecord?.error === "string" && asRecord.error) ||
          (typeof asRecord?.message === "string" && asRecord.message) ||
          `HTTP ${res.statusCode}`;
        const details = asRecord && Object.prototype.hasOwnProperty.call(asRecord, "details")
          ? asRecord.details
          : null;

        return originalJson({
          trace_id: traceId,
          code,
          message,
          data: details,
        } satisfies ApiEnvelope<unknown>);
      }

      return originalJson({
        trace_id: traceId,
        code: 0,
        message: "ok",
        data: body ?? null,
      } satisfies ApiEnvelope<unknown>);
    }) as Response["json"];

    next();
  };
}
