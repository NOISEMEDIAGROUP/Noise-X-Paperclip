import { asc, eq, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { goals, projectGoals } from "@paperclipai/db";

type GoalRow = typeof goals.$inferSelect;
type GoalWithProject = GoalRow & { projectId: string | null };

async function attachProjectIds(db: Db, rows: GoalRow[]): Promise<GoalWithProject[]> {
  if (rows.length === 0) return [];

  const goalIds = rows.map((row) => row.id);
  const links = await db
    .select({
      goalId: projectGoals.goalId,
      projectId: projectGoals.projectId,
    })
    .from(projectGoals)
    .where(inArray(projectGoals.goalId, goalIds))
    .orderBy(asc(projectGoals.createdAt));

  const projectByGoalId = new Map<string, string>();
  for (const link of links) {
    if (!projectByGoalId.has(link.goalId)) {
      projectByGoalId.set(link.goalId, link.projectId);
    }
  }

  return rows.map((row) => ({
    ...row,
    projectId: projectByGoalId.get(row.id) ?? null,
  }));
}

export function goalService(db: Db) {
  return {
    list: async (companyId: string): Promise<GoalWithProject[]> => {
      const rows = await db.select().from(goals).where(eq(goals.companyId, companyId));
      return attachProjectIds(db, rows);
    },

    getById: async (id: string): Promise<GoalWithProject | null> => {
      const row = await db
        .select()
        .from(goals)
        .where(eq(goals.id, id))
        .then((rows) => rows[0] ?? null);
      if (!row) return null;
      const [enriched] = await attachProjectIds(db, [row]);
      return enriched ?? null;
    },

    create: async (
      companyId: string,
      data: Omit<typeof goals.$inferInsert, "companyId"> & { projectId?: string | null },
    ): Promise<GoalWithProject> => {
      const { projectId, ...goalData } = data;
      const row = await db
        .insert(goals)
        .values({ ...goalData, companyId })
        .returning()
        .then((rows) => rows[0]);

      if (projectId) {
        await db.insert(projectGoals).values({
          companyId,
          projectId,
          goalId: row.id,
        });
      }

      const [enriched] = await attachProjectIds(db, [row]);
      return enriched!;
    },

    update: async (
      id: string,
      data: Partial<typeof goals.$inferInsert> & { projectId?: string | null },
    ): Promise<GoalWithProject | null> => {
      const { projectId, ...goalData } = data;
      const row = await db
        .update(goals)
        .set({ ...goalData, updatedAt: new Date() })
        .where(eq(goals.id, id))
        .returning()
        .then((rows) => rows[0] ?? null);

      if (!row) {
        return null;
      }

      if (projectId !== undefined) {
        await db.delete(projectGoals).where(eq(projectGoals.goalId, id));
        if (projectId) {
          await db.insert(projectGoals).values({
            companyId: row.companyId,
            projectId,
            goalId: id,
          });
        }
      }

      const [enriched] = await attachProjectIds(db, [row]);
      return enriched ?? null;
    },

    remove: (id: string) =>
      db
        .delete(goals)
        .where(eq(goals.id, id))
        .returning()
        .then((rows) => rows[0] ?? null),
  };
}
