import type { Request, RequestHandler } from "express";

const DEFAULT_DEV_ORIGINS = [
  "http://localhost:3100",
  "http://127.0.0.1:3100",
];

const CORS_METHODS = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"];
const CORS_HEADERS = [
  "Authorization",
  "Content-Type",
  "X-Paperclip-Run-Id",
  "X-Request-Id",
  "X-Trace-Id",
  "X-Paperclip-Api-Envelope",
];

function normalizeHostname(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.startsWith("[")) {
    const end = normalized.indexOf("]");
    return end > 1 ? normalized.slice(1, end) : null;
  }
  const colonIndex = normalized.indexOf(":");
  if (colonIndex > 0) return normalized.slice(0, colonIndex);
  return normalized;
}

function parseOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return null;
  }
}

function collectTrustedOrigins(opts: { allowedHostnames: string[]; bindHost: string; authPublicBaseUrl?: string }): Set<string> {
  const origins = new Set<string>(DEFAULT_DEV_ORIGINS.map((value) => value.toLowerCase()));

  for (const hostname of opts.allowedHostnames) {
    const normalized = normalizeHostname(hostname);
    if (!normalized) continue;
    origins.add(`http://${normalized}`);
    origins.add(`https://${normalized}`);
  }

  const bindHost = normalizeHostname(opts.bindHost);
  if (bindHost && bindHost !== "0.0.0.0" && bindHost !== "::") {
    origins.add(`http://${bindHost}`);
    origins.add(`https://${bindHost}`);
  }

  const authPublicOrigin = parseOrigin(opts.authPublicBaseUrl);
  if (authPublicOrigin) {
    origins.add(authPublicOrigin);
  }

  const extraTrustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((value) => parseOrigin(value.trim()))
    .filter((value): value is string => Boolean(value));
  for (const origin of extraTrustedOrigins) {
    origins.add(origin);
  }

  return origins;
}

function requestIsHttps(req: Request): boolean {
  const proto = req.header("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (proto) return proto === "https";
  return req.protocol === "https";
}

export function securityBaseline(opts: {
  allowedHostnames: string[];
  bindHost: string;
  authPublicBaseUrl?: string;
}): RequestHandler {
  const trustedOrigins = collectTrustedOrigins(opts);

  return (req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

    if (requestIsHttps(req)) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    const requestOrigin = parseOrigin(req.header("origin"));
    if (!requestOrigin) {
      next();
      return;
    }

    const hostOrigin = parseOrigin(`http://${req.header("host")?.trim() ?? ""}`);
    const allowed = requestOrigin === hostOrigin || trustedOrigins.has(requestOrigin);

    if (allowed) {
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Origin", requestOrigin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", CORS_METHODS.join(", "));
      res.setHeader("Access-Control-Allow-Headers", CORS_HEADERS.join(", "));
      res.setHeader("Access-Control-Max-Age", "600");

      if (req.method.toUpperCase() === "OPTIONS") {
        res.status(204).end();
        return;
      }

      next();
      return;
    }

    if (req.method.toUpperCase() === "OPTIONS") {
      res.status(403).json({ error: "CORS origin is not allowed" });
      return;
    }

    next();
  };
}
