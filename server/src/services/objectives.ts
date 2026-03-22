// @ts-nocheck
import { eq, and, desc } from "drizzle-orm";
import { companyObjectives, keyResults } from "@paperclipai/db";
function mapKeyResult(row) {
  return {
    ...row,
    status: row.status,
    targetValue: Number(row.targetValue),
    currentValue: Number(row.currentValue),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
function mapObjective(row, objectiveKeyResults) {
  return {
    ...row,
    objectiveType: row.objectiveType,
    status: row.status,
    targetValue: row.targetValue ? Number(row.targetValue) : null,
    currentValue: Number(row.currentValue),
    deadline: row.deadline,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    keyResults: objectiveKeyResults
  };
}
function objectivesService(db) {
  return {
    create: async (companyId, payload) => {
      const [objective] = await db.insert(companyObjectives).values({
        companyId,
        title: payload.title,
        description: payload.description ?? null,
        objectiveType: payload.objectiveType ?? "quarterly",
        status: payload.status ?? "proposed",
        targetMetric: payload.targetMetric ?? null,
        targetValue: payload.targetValue ? String(payload.targetValue) : null,
        currentValue: payload.currentValue ? String(payload.currentValue) : "0",
        proposedBy: payload.proposedBy ?? null,
        approvedBy: payload.approvedBy ?? null,
        deadline: payload.deadline ?? null
      }).returning();
      let krs = [];
      if (payload.keyResults && payload.keyResults.length > 0) {
        krs = await db.insert(keyResults).values(
          payload.keyResults.map((kr) => ({
            objectiveId: objective.id,
            title: kr.title,
            targetValue: String(kr.targetValue),
            currentValue: String(kr.currentValue ?? 0),
            assignedTo: kr.assignedTo ?? null,
            status: "pending"
          }))
        ).returning();
      }
      return mapObjective(objective, krs.map(mapKeyResult));
    },
    update: async (id, companyId, payload) => {
      const updateData = {};
      if (payload.title !== void 0) updateData.title = payload.title;
      if (payload.description !== void 0) updateData.description = payload.description;
      if (payload.objectiveType !== void 0) updateData.objectiveType = payload.objectiveType;
      if (payload.status !== void 0) updateData.status = payload.status;
      if (payload.targetMetric !== void 0) updateData.targetMetric = payload.targetMetric;
      if (payload.targetValue !== void 0) updateData.targetValue = payload.targetValue ? String(payload.targetValue) : null;
      if (payload.currentValue !== void 0) updateData.currentValue = payload.currentValue ? String(payload.currentValue) : "0";
      if (payload.proposedBy !== void 0) updateData.proposedBy = payload.proposedBy;
      if (payload.approvedBy !== void 0) updateData.approvedBy = payload.approvedBy;
      if (payload.deadline !== void 0) updateData.deadline = payload.deadline;
      if (Object.keys(updateData).length > 0) {
        updateData.updatedAt = /* @__PURE__ */ new Date();
        await db.update(companyObjectives).set(updateData).where(and(eq(companyObjectives.id, id), eq(companyObjectives.companyId, companyId)));
      }
      return objectivesService(db).getById(id, companyId);
    },
    getById: async (id, companyId) => {
      const objective = await db.query.companyObjectives.findFirst({
        where: and(eq(companyObjectives.id, id), eq(companyObjectives.companyId, companyId))
      });
      if (!objective) throw new Error("Objective not found");
      const krs = await db.query.keyResults.findMany({
        where: eq(keyResults.objectiveId, id)
      });
      return mapObjective(objective, krs.map(mapKeyResult));
    },
    list: async (companyId) => {
      const objectives = await db.query.companyObjectives.findMany({
        where: eq(companyObjectives.companyId, companyId),
        orderBy: [desc(companyObjectives.createdAt)]
      });
      const allKrs = await db.select({ keyResult: keyResults }).from(keyResults).innerJoin(companyObjectives, eq(keyResults.objectiveId, companyObjectives.id)).where(eq(companyObjectives.companyId, companyId));
      const krsByObjective = /* @__PURE__ */ new Map();
      for (const { keyResult } of allKrs) {
        const arr = krsByObjective.get(keyResult.objectiveId) || [];
        arr.push(mapKeyResult(keyResult));
        krsByObjective.set(keyResult.objectiveId, arr);
      }
      return objectives.map((obj) => mapObjective(obj, krsByObjective.get(obj.id) || []));
    },
    delete: async (id, companyId) => {
      const obj = await db.query.companyObjectives.findFirst({
        where: and(eq(companyObjectives.id, id), eq(companyObjectives.companyId, companyId))
      });
      if (!obj) throw new Error("Objective not found");
      await db.delete(keyResults).where(eq(keyResults.objectiveId, id));
      await db.delete(companyObjectives).where(eq(companyObjectives.id, id));
    },
    addKeyResult: async (objectiveId, companyId, payload) => {
      const obj = await db.query.companyObjectives.findFirst({
        where: and(eq(companyObjectives.id, objectiveId), eq(companyObjectives.companyId, companyId))
      });
      if (!obj) throw new Error("Objective not found");
      const [kr] = await db.insert(keyResults).values({
        objectiveId,
        title: payload.title,
        targetValue: String(payload.targetValue),
        currentValue: String(payload.currentValue ?? 0),
        assignedTo: payload.assignedTo ?? null,
        status: "pending"
      }).returning();
      return mapKeyResult(kr);
    },
    updateKeyResult: async (id, objectiveId, companyId, payload) => {
      const obj = await db.query.companyObjectives.findFirst({
        where: and(eq(companyObjectives.id, objectiveId), eq(companyObjectives.companyId, companyId))
      });
      if (!obj) throw new Error("Objective not found");
      const updateData = {};
      if (payload.title !== void 0) updateData.title = payload.title;
      if (payload.targetValue !== void 0) updateData.targetValue = String(payload.targetValue);
      if (payload.currentValue !== void 0) updateData.currentValue = String(payload.currentValue);
      if (payload.assignedTo !== void 0) updateData.assignedTo = payload.assignedTo;
      if (payload.status !== void 0) updateData.status = payload.status;
      if (Object.keys(updateData).length > 0) {
        updateData.updatedAt = /* @__PURE__ */ new Date();
        const [kr2] = await db.update(keyResults).set(updateData).where(and(eq(keyResults.id, id), eq(keyResults.objectiveId, objectiveId))).returning();
        if (!kr2) throw new Error("Key result not found");
        return mapKeyResult(kr2);
      }
      const kr = await db.query.keyResults.findFirst({ where: eq(keyResults.id, id) });
      if (!kr) throw new Error("Key result not found");
      return mapKeyResult(kr);
    },
    deleteKeyResult: async (id, objectiveId, companyId) => {
      const obj = await db.query.companyObjectives.findFirst({
        where: and(eq(companyObjectives.id, objectiveId), eq(companyObjectives.companyId, companyId))
      });
      if (!obj) throw new Error("Objective not found");
      await db.delete(keyResults).where(and(eq(keyResults.id, id), eq(keyResults.objectiveId, objectiveId)));
    }
  };
}
export {
  objectivesService
};
