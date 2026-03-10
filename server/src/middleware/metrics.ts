import type { Request, RequestHandler } from "express";

type MetricKey = `${string}|${string}|${string}|${string}`;

interface MetricEntry {
  count: number;
  errorCount: number;
  totalDurationMs: number;
}

interface ApiMetricsRegistry {
  middleware: RequestHandler;
  renderPrometheus: () => string;
}

function normalizePath(path: string): string {
  if (!path) return "/";
  const segments = path
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segment)) {
        return ":uuid";
      }
      if (/^\d+$/.test(segment)) {
        return ":int";
      }
      if (/^[0-9a-f]{16,}$/i.test(segment)) {
        return ":id";
      }
      return segment;
    });

  return `/${segments.join("/")}`;
}

function resolveActorType(req: Request): string {
  return req.actor?.type ?? "unknown";
}

export function createApiMetricsRegistry(): ApiMetricsRegistry {
  const counters = new Map<MetricKey, MetricEntry>();

  const middleware: RequestHandler = (req, res, next) => {
    if (!req.path.startsWith("/api")) {
      next();
      return;
    }

    const startedAt = process.hrtime.bigint();

    res.once("finish", () => {
      const endedAt = process.hrtime.bigint();
      const durationMs = Number(endedAt - startedAt) / 1_000_000;

      const method = req.method.toUpperCase();
      const route = normalizePath(req.path);
      const status = String(res.statusCode);
      const actorType = resolveActorType(req);
      const key = `${method}|${route}|${status}|${actorType}` as MetricKey;

      const current = counters.get(key) ?? {
        count: 0,
        errorCount: 0,
        totalDurationMs: 0,
      };

      current.count += 1;
      if (res.statusCode >= 400) current.errorCount += 1;
      current.totalDurationMs += durationMs;
      counters.set(key, current);
    });

    next();
  };

  function renderPrometheus(): string {
    const lines: string[] = [];
    lines.push("# HELP paperclip_http_requests_total Total number of HTTP API requests.");
    lines.push("# TYPE paperclip_http_requests_total counter");

    lines.push("# HELP paperclip_http_request_errors_total Total number of HTTP API requests with status >= 400.");
    lines.push("# TYPE paperclip_http_request_errors_total counter");

    lines.push("# HELP paperclip_http_request_duration_ms_sum Sum of API request durations in milliseconds.");
    lines.push("# TYPE paperclip_http_request_duration_ms_sum counter");

    lines.push("# HELP paperclip_http_request_duration_ms_count Count of API requests for duration aggregation.");
    lines.push("# TYPE paperclip_http_request_duration_ms_count counter");

    for (const [key, value] of counters.entries()) {
      const [method, route, status, actorType] = key.split("|");
      const labels = `method="${method}",route="${route}",status="${status}",actor_type="${actorType}"`;
      lines.push(`paperclip_http_requests_total{${labels}} ${value.count}`);
      lines.push(`paperclip_http_request_errors_total{${labels}} ${value.errorCount}`);
      lines.push(`paperclip_http_request_duration_ms_sum{${labels}} ${value.totalDurationMs.toFixed(3)}`);
      lines.push(`paperclip_http_request_duration_ms_count{${labels}} ${value.count}`);
    }

    lines.push("# HELP paperclip_http_metrics_series Number of in-memory metric series.");
    lines.push("# TYPE paperclip_http_metrics_series gauge");
    lines.push(`paperclip_http_metrics_series ${counters.size}`);

    return `${lines.join("\n")}\n`;
  }

  return {
    middleware,
    renderPrometheus,
  };
}
