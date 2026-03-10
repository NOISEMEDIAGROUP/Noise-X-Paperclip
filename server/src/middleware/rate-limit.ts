import type { Request, RequestHandler } from "express";

interface Bucket {
  count: number;
  resetAtMs: number;
}

const WINDOW_MS = 60_000;
const DEFAULT_LIMIT_PER_WINDOW = 240;
const MAX_BUCKETS = 10_000;

function resolveIp(req: Request): string {
  const forwarded = req.header("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return req.ip || req.socket.remoteAddress || "unknown";
}

function resolveScope(req: Request): string {
  if (req.actor.type === "agent") {
    return `agent:${req.actor.agentId ?? "unknown"}`;
  }
  if (req.actor.type === "board") {
    if (req.actor.userId) return `board:${req.actor.userId}`;
    return `board:${resolveIp(req)}`;
  }
  return `ip:${resolveIp(req)}`;
}

function shouldSkip(req: Request): boolean {
  if (!req.path.startsWith("/api")) return true;
  if (req.path === "/api/health") return true;
  return false;
}

function resolveEnabled(): boolean {
  if (process.env.PAPERCLIP_RATE_LIMIT_ENABLED !== undefined) {
    return process.env.PAPERCLIP_RATE_LIMIT_ENABLED === "true";
  }
  return process.env.NODE_ENV !== "test";
}

function resolveLimitPerWindow(): number {
  const fromEnv = Number(process.env.PAPERCLIP_RATE_LIMIT_PER_MINUTE);
  if (!Number.isFinite(fromEnv) || fromEnv <= 0) return DEFAULT_LIMIT_PER_WINDOW;
  return Math.floor(fromEnv);
}

export function apiRateLimit(): RequestHandler {
  const enabled = resolveEnabled();
  if (!enabled) {
    return (_req, _res, next) => next();
  }

  const limitPerWindow = resolveLimitPerWindow();
  const buckets = new Map<string, Bucket>();

  return (req, res, next) => {
    if (shouldSkip(req)) {
      next();
      return;
    }

    const now = Date.now();
    const scope = resolveScope(req);
    const key = `${scope}:${req.method.toUpperCase()}:${req.path}`;

    const existing = buckets.get(key);
    if (!existing || existing.resetAtMs <= now) {
      buckets.set(key, { count: 1, resetAtMs: now + WINDOW_MS });

      res.setHeader("X-RateLimit-Limit", String(limitPerWindow));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, limitPerWindow - 1)));
      res.setHeader("X-RateLimit-Reset", String(Math.ceil((now + WINDOW_MS) / 1000)));
      next();
      return;
    }

    existing.count += 1;

    if (existing.count > limitPerWindow) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAtMs - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.setHeader("X-RateLimit-Limit", String(limitPerWindow));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", String(Math.ceil(existing.resetAtMs / 1000)));
      res.status(429).json({ error: "Rate limit exceeded" });
      return;
    }

    res.setHeader("X-RateLimit-Limit", String(limitPerWindow));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, limitPerWindow - existing.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(existing.resetAtMs / 1000)));

    if (buckets.size > MAX_BUCKETS) {
      for (const [bucketKey, bucket] of buckets.entries()) {
        if (bucket.resetAtMs <= now) {
          buckets.delete(bucketKey);
        }
      }
    }

    next();
  };
}
