import { Router } from "express";
import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { skills } from "@paperclipai/db";
import { createSkillSchema } from "@paperclipai/shared";
import { conflict, notFound } from "../errors.js";
import { validate } from "../middleware/validate.js";
import { assertBoard, assertCompanyAccess } from "./authz.js";
import { listBuiltinSkills, normalizeSkillName } from "../lib/skills.js";

export function skillRoutes(db: Db) {
  const router = Router();

  router.get("/companies/:companyId/skills", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const customSkills = await db
      .select({
        id: skills.id,
        companyId: skills.companyId,
        name: skills.name,
        label: skills.label,
        description: skills.description,
        scope: skills.scope,
        createdAt: skills.createdAt,
        updatedAt: skills.updatedAt,
      })
      .from(skills)
      .where(eq(skills.companyId, companyId))
      .orderBy(asc(skills.name));

    const builtins = listBuiltinSkills().map((skill) => ({
      id: `builtin:${skill.name}`,
      companyId,
      name: skill.name,
      label: skill.label,
      description: skill.description,
      scope: ["all"],
      createdAt: null,
      updatedAt: null,
      isBuiltin: true,
    }));

    const customByName = new Set(customSkills.map((skill) => skill.name));
    const merged = [
      ...builtins.filter((skill) => !customByName.has(skill.name)),
      ...customSkills.map((skill) => ({ ...skill, isBuiltin: false })),
    ].sort((left, right) => left.name.localeCompare(right.name));

    res.json(merged);
  });

  router.post("/companies/:companyId/skills", validate(createSkillSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    assertBoard(req);

    const payload = req.body as {
      name: string;
      label: string;
      description?: string | null;
      content: string;
      scope: string[];
    };

    const name = normalizeSkillName(payload.name);
    if (!name) {
      res.status(422).json({ error: "Invalid skill name" });
      return;
    }

    const builtins = new Set(listBuiltinSkills().map((skill) => skill.name));
    if (builtins.has(name)) {
      throw conflict(`Skill '${name}' is reserved by a built-in skill`);
    }

    const existing = await db
      .select({ id: skills.id })
      .from(skills)
      .where(and(eq(skills.companyId, companyId), eq(skills.name, name)))
      .limit(1);
    if (existing.length > 0) {
      throw conflict(`Skill '${name}' already exists`);
    }

    const [created] = await db
      .insert(skills)
      .values({
        companyId,
        name,
        label: payload.label.trim(),
        description: payload.description?.trim() || null,
        content: payload.content,
        scope: payload.scope,
      })
      .returning();

    res.status(201).json({ ...created, isBuiltin: false });
  });

  router.get("/companies/:companyId/skills/:skillId", async (req, res) => {
    const companyId = req.params.companyId as string;
    const skillId = req.params.skillId as string;
    assertCompanyAccess(req, companyId);

    if (skillId.startsWith("builtin:")) {
      const skillName = skillId.slice("builtin:".length);
      const skill = listBuiltinSkills().find((entry) => entry.name === skillName);
      if (!skill) throw notFound("Skill not found");
      res.json({
        id: skillId,
        companyId,
        name: skill.name,
        label: skill.label,
        description: skill.description,
        content: null,
        scope: ["all"],
        createdAt: null,
        updatedAt: null,
        isBuiltin: true,
      });
      return;
    }

    const [skill] = await db
      .select()
      .from(skills)
      .where(and(eq(skills.companyId, companyId), eq(skills.id, skillId)))
      .limit(1);
    if (!skill) throw notFound("Skill not found");
    res.json({ ...skill, isBuiltin: false });
  });

  router.delete("/companies/:companyId/skills/:skillId", async (req, res) => {
    const companyId = req.params.companyId as string;
    const skillId = req.params.skillId as string;
    assertCompanyAccess(req, companyId);
    assertBoard(req);

    if (skillId.startsWith("builtin:")) {
      throw conflict("Built-in skills cannot be deleted");
    }

    const [deleted] = await db
      .delete(skills)
      .where(and(eq(skills.companyId, companyId), eq(skills.id, skillId)))
      .returning({ id: skills.id });
    if (!deleted) throw notFound("Skill not found");
    res.json({ ok: true });
  });

  return router;
}
