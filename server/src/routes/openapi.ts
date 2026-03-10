import { Router } from "express";
import { buildOpenApiSpec } from "../openapi/spec.js";

export function openApiRoutes(opts?: { publicBaseUrl?: string }) {
  const router = Router();

  router.get("/openapi.json", (_req, res) => {
    res.locals.skipApiEnvelope = true;
    const spec = buildOpenApiSpec({ publicBaseUrl: opts?.publicBaseUrl });
    res.status(200).json(spec);
  });

  router.get("/docs", (_req, res) => {
    res.locals.skipApiEnvelope = true;
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Paperclip API Docs</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; line-height: 1.5; }
      code { background: #f4f4f5; padding: 2px 6px; border-radius: 4px; }
      a { color: #2563eb; text-decoration: none; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <h1>Paperclip API Docs</h1>
    <p>OpenAPI contract is available at <a href="/api/openapi.json"><code>/api/openapi.json</code></a>.</p>
    <p>For envelope responses, send header <code>x-paperclip-api-envelope: v1</code>.</p>
  </body>
</html>`;
    res.status(200).type("text/html").send(html);
  });

  return router;
}
