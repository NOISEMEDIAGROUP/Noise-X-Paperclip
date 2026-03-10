import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

const TRACE_ID_HEADER = "x-trace-id";
const REQUEST_ID_HEADER = "x-request-id";
const TRACE_ID_PATTERN = /^[a-zA-Z0-9._:-]{8,128}$/;

function normalizeTraceId(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (!TRACE_ID_PATTERN.test(normalized)) return null;
  return normalized;
}

export function requestContextMiddleware(): RequestHandler {
  return (req, res, next) => {
    const traceId =
      normalizeTraceId(req.header(TRACE_ID_HEADER)) ??
      normalizeTraceId(req.header(REQUEST_ID_HEADER)) ??
      randomUUID();

    req.traceId = traceId;
    res.setHeader(TRACE_ID_HEADER, traceId);
    next();
  };
}
