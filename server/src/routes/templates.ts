import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveTemplatesDir(category: string): string | null {
  const candidates = [
    path.resolve(__dirname, "../../templates", category),
    path.resolve(process.cwd(), "templates", category),
    path.resolve(__dirname, "../../../templates", category),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

function loadTemplates(category: string): Record<string, unknown>[] {
  const dir = resolveTemplatesDir(category);
  if (!dir) return [];

  const templates: Record<string, unknown>[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const content = fs.readFileSync(path.join(dir, file), "utf8");
      templates.push(JSON.parse(content) as Record<string, unknown>);
    } catch {
      // skip malformed template files
    }
  }
  return templates;
}

export function templateRoutes() {
  const router = Router();

  router.get("/templates/agents", (_req, res) => {
    const templates = loadTemplates("agents");
    res.json({ templates });
  });

  router.get("/templates/agents/:templateId", (req, res) => {
    const templateId = req.params.templateId as string;
    const templates = loadTemplates("agents");
    const template = templates.find(
      (t) => (t as { id?: string }).id === templateId,
    );
    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    res.json(template);
  });

  return router;
}
