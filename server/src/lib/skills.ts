import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type BuiltinSkillSummary = {
  name: string;
  label: string;
  description: string;
};

const SKILL_NAME_REGEX = /^[a-z0-9][a-z0-9_-]{1,63}$/;

function skillsRootCandidates() {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return [
    path.resolve(moduleDir, "../../skills"),
    path.resolve(process.cwd(), "skills"),
    path.resolve(moduleDir, "../../../skills"),
  ];
}

function titleCaseFromSlug(value: string): string {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeSkillName(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (!SKILL_NAME_REGEX.test(normalized)) return null;
  return normalized;
}

export function listBuiltinSkillNames(): string[] {
  const names = new Set<string>();
  for (const root of skillsRootCandidates()) {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(root, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const normalized = normalizeSkillName(entry.name);
      if (!normalized) continue;
      const skillPath = path.join(root, normalized, "SKILL.md");
      if (fs.existsSync(skillPath)) {
        names.add(normalized);
      }
    }
  }
  return Array.from(names).sort();
}

export function readBuiltinSkillMarkdown(skillName: string): string | null {
  const normalized = normalizeSkillName(skillName);
  if (!normalized) return null;
  for (const root of skillsRootCandidates()) {
    const skillPath = path.join(root, normalized, "SKILL.md");
    try {
      return fs.readFileSync(skillPath, "utf8");
    } catch {
      // continue
    }
  }
  return null;
}

export function listBuiltinSkills(): BuiltinSkillSummary[] {
  return listBuiltinSkillNames().map((name) => ({
    name,
    label: titleCaseFromSlug(name),
    description: "Built-in skill from repository",
  }));
}
