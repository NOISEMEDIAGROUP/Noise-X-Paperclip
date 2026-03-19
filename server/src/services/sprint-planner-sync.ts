import type { Db } from "@paperclipai/db";
import type { SprintPlannerService } from "./sprint-planner.js";
import { knowledgeService } from "./knowledge.js";
import { logger } from "../middleware/logger.js";

/**
 * Periodic sync job that pulls sprint planner knowledge items and completed
 * retro notes into the Paperclip knowledge hub, tagged `source:sprint-planner`.
 */
export function sprintPlannerSyncService(
  db: Db,
  sprintPlanner: SprintPlannerService,
  companyId: string,
) {
  const knowledge = knowledgeService(db);
  let intervalHandle: ReturnType<typeof setInterval> | null = null;

  /** Batch-lookup existing docs by tag to build a slug→id map. */
  async function buildExistingSlugsMap(tag: string): Promise<Map<string, string>> {
    const existing = await knowledge.list(companyId, { tag });
    const map = new Map<string, string>();
    for (const doc of existing) {
      map.set(doc.slug, doc.id);
    }
    return map;
  }

  async function syncKnowledgeItems(): Promise<void> {
    try {
      const items = await sprintPlanner.searchKnowledge("agent-training");
      const existingSlugs = await buildExistingSlugsMap("source:sprint-planner");

      for (const item of items) {
        const slug = `sp-${item.id}`;
        const existingId = existingSlugs.get(slug);
        if (existingId) {
          await knowledge.update(existingId, {
            title: item.title,
            content: item.content,
            category: item.category ?? "sprint-planner",
            tags: [...(item.tags ?? []), "source:sprint-planner"],
          });
        } else {
          await knowledge.create(companyId, {
            title: item.title,
            slug,
            content: item.content,
            category: item.category ?? "sprint-planner",
            tags: [...(item.tags ?? []), "source:sprint-planner"],
            status: "published",
            createdByType: "system",
            createdById: "sprint-planner-sync",
          });
        }
      }
      logger.info({ count: items.length }, "Sprint planner knowledge sync complete");
    } catch (err) {
      logger.warn({ err }, "Sprint planner knowledge sync failed");
    }
  }

  async function syncRetroNotes(sprintId: string): Promise<void> {
    try {
      const notes = await sprintPlanner.getRetroNotes(sprintId);
      const existingSlugs = await buildExistingSlugsMap("source:sprint-planner");

      for (const note of notes) {
        const slug = `sp-retro-${note.id}`;
        if (!existingSlugs.has(slug)) {
          await knowledge.create(companyId, {
            title: `[Retro] ${note.title}`,
            slug,
            content: note.content,
            category: "retro",
            tags: ["retro", "agent-training", "source:sprint-planner"],
            status: "published",
            createdByType: "system",
            createdById: "sprint-planner-sync",
          });
        }
      }
      logger.info({ sprintId, count: notes.length }, "Sprint retro notes synced");
    } catch (err) {
      logger.warn({ err, sprintId }, "Sprint retro sync failed");
    }
  }

  return {
    syncKnowledgeItems,
    syncRetroNotes,

    /** Start periodic sync at the given interval (ms). Default: 30 minutes. */
    start: (intervalMs = 30 * 60 * 1000) => {
      if (intervalHandle) return;
      void syncKnowledgeItems();
      intervalHandle = setInterval(() => void syncKnowledgeItems(), intervalMs);
      logger.info({ intervalMs }, "Sprint planner sync started");
    },

    stop: () => {
      if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
      }
    },
  };
}

export type SprintPlannerSyncService = ReturnType<typeof sprintPlannerSyncService>;
