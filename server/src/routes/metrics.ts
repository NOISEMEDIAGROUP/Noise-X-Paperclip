import { timingSafeEqual } from "node:crypto";
import { Router, type Request } from "express";
import type { DeploymentMode } from "@paperclipai/shared";

function safeTokenMatch(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

function hasBearerToken(req: Request, token: string): boolean {
  const authHeader = req.header("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) return false;
  const incoming = authHeader.slice("bearer ".length).trim();
  if (!incoming) return false;
  return safeTokenMatch(incoming, token);
}

function allowAnonymousMetrics(): boolean {
  return process.env.PAPERCLIP_METRICS_ALLOW_ANONYMOUS === "true";
}

export function metricsRoutes(opts: {
  deploymentMode: DeploymentMode;
  renderPrometheus: () => string;
}) {
  const router = Router();

  router.get("/metrics", (req, res) => {
    const metricsToken = process.env.PAPERCLIP_METRICS_BEARER_TOKEN?.trim();
    const tokenAuthorized = metricsToken ? hasBearerToken(req, metricsToken) : false;
    const anonymousAllowed = allowAnonymousMetrics();

    if (!tokenAuthorized && !anonymousAllowed) {
      if (opts.deploymentMode === "authenticated" && req.actor.type !== "board") {
        res.status(401).json({ error: "Board access required" });
        return;
      }
    }

    res.locals.skipApiEnvelope = true;
    res.status(200).type("text/plain; version=0.0.4; charset=utf-8").send(opts.renderPrometheus());
  });

  return router;
}
