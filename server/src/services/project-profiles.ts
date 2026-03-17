import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { projectProfiles, projectIntegrations, projectScrapers, projects } from "@paperclipai/db";
import type {
  ProjectProfile,
  ProjectIntegration,
  ProjectScraper,
} from "@paperclipai/shared";

type ProfileRow = typeof projectProfiles.$inferSelect;
type IntegrationRow = typeof projectIntegrations.$inferSelect;
type ScraperRow = typeof projectScrapers.$inferSelect;

function toProfile(
  row: ProfileRow,
  integrations: IntegrationRow[] = [],
  scrapers: ScraperRow[] = [],
): ProjectProfile {
  return {
    id: row.id,
    projectId: row.projectId,
    companyId: row.companyId,
    slug: row.slug,
    customerName: row.customerName,
    customerContact: row.customerContact,
    businessModel: row.businessModel,
    productionUrl: row.productionUrl,
    stagingUrl: row.stagingUrl,
    hostPort: row.hostPort,
    vpsDirectory: row.vpsDirectory,
    dbSchema: row.dbSchema,
    techStack: row.techStack as ProjectProfile["techStack"],
    moduleStats: row.moduleStats as ProjectProfile["moduleStats"],
    iosCompanion: row.iosCompanion as ProjectProfile["iosCompanion"],
    features: row.features as ProjectProfile["features"],
    phase: row.phase,
    launchedAt: row.launchedAt,
    integrations: integrations.map(toIntegration),
    scrapers: scrapers.map(toScraper),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toIntegration(row: IntegrationRow): ProjectIntegration {
  return {
    id: row.id,
    projectId: row.projectId,
    companyId: row.companyId,
    integrationType: row.integrationType,
    name: row.name,
    config: row.config as Record<string, unknown> | null,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toScraper(row: ScraperRow): ProjectScraper {
  return {
    id: row.id,
    projectId: row.projectId,
    companyId: row.companyId,
    name: row.name,
    port: row.port,
    vpsDirectory: row.vpsDirectory,
    status: row.status,
    healthCheckUrl: row.healthCheckUrl,
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function projectProfileService(db: Db) {
  async function hydrateProfile(row: ProfileRow): Promise<ProjectProfile> {
    const [integrationRows, scraperRows] = await Promise.all([
      db
        .select()
        .from(projectIntegrations)
        .where(eq(projectIntegrations.projectId, row.projectId)),
      db
        .select()
        .from(projectScrapers)
        .where(eq(projectScrapers.projectId, row.projectId)),
    ]);
    return toProfile(row, integrationRows, scraperRows);
  }

  return {
    getByProjectId: async (projectId: string): Promise<ProjectProfile | null> => {
      const row = await db
        .select()
        .from(projectProfiles)
        .where(eq(projectProfiles.projectId, projectId))
        .then((rows) => rows[0] ?? null);
      if (!row) return null;
      return hydrateProfile(row);
    },

    getBySlug: async (slug: string): Promise<ProjectProfile | null> => {
      const row = await db
        .select()
        .from(projectProfiles)
        .where(eq(projectProfiles.slug, slug))
        .then((rows) => rows[0] ?? null);
      if (!row) return null;
      return hydrateProfile(row);
    },

    /** Batch-load profiles for a set of projects (used in list hydration). */
    batchGetByProjectIds: async (projectIds: string[]): Promise<Map<string, ProjectProfile>> => {
      if (projectIds.length === 0) return new Map();
      const rows = await db
        .select()
        .from(projectProfiles)
        .where(inArray(projectProfiles.projectId, projectIds));
      if (rows.length === 0) return new Map();

      const pIds = rows.map((r) => r.projectId);
      const [integrationRows, scraperRows] = await Promise.all([
        db.select().from(projectIntegrations).where(inArray(projectIntegrations.projectId, pIds)),
        db.select().from(projectScrapers).where(inArray(projectScrapers.projectId, pIds)),
      ]);

      const intMap = new Map<string, IntegrationRow[]>();
      for (const r of integrationRows) {
        let arr = intMap.get(r.projectId);
        if (!arr) { arr = []; intMap.set(r.projectId, arr); }
        arr.push(r);
      }

      const scrMap = new Map<string, ScraperRow[]>();
      for (const r of scraperRows) {
        let arr = scrMap.get(r.projectId);
        if (!arr) { arr = []; scrMap.set(r.projectId, arr); }
        arr.push(r);
      }

      const result = new Map<string, ProjectProfile>();
      for (const row of rows) {
        result.set(
          row.projectId,
          toProfile(row, intMap.get(row.projectId) ?? [], scrMap.get(row.projectId) ?? []),
        );
      }
      return result;
    },

    upsert: async (
      projectId: string,
      companyId: string,
      data: Partial<typeof projectProfiles.$inferInsert>,
    ): Promise<ProjectProfile | null> => {
      const existing = await db
        .select()
        .from(projectProfiles)
        .where(eq(projectProfiles.projectId, projectId))
        .then((rows) => rows[0] ?? null);

      let row: ProfileRow;
      if (existing) {
        const updated = await db
          .update(projectProfiles)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(projectProfiles.projectId, projectId))
          .returning()
          .then((rows) => rows[0]);
        row = updated;
      } else {
        const inserted = await db
          .insert(projectProfiles)
          .values({ ...data, projectId, companyId } as typeof projectProfiles.$inferInsert)
          .returning()
          .then((rows) => rows[0]);
        row = inserted;
      }
      return hydrateProfile(row);
    },

    addIntegration: async (
      projectId: string,
      companyId: string,
      data: Omit<typeof projectIntegrations.$inferInsert, "projectId" | "companyId">,
    ): Promise<ProjectIntegration> => {
      const row = await db
        .insert(projectIntegrations)
        .values({ ...data, projectId, companyId })
        .returning()
        .then((rows) => rows[0]);
      return toIntegration(row);
    },

    removeIntegration: async (integrationId: string): Promise<ProjectIntegration | null> => {
      const row = await db
        .delete(projectIntegrations)
        .where(eq(projectIntegrations.id, integrationId))
        .returning()
        .then((rows) => rows[0] ?? null);
      return row ? toIntegration(row) : null;
    },

    addScraper: async (
      projectId: string,
      companyId: string,
      data: Omit<typeof projectScrapers.$inferInsert, "projectId" | "companyId">,
    ): Promise<ProjectScraper> => {
      const row = await db
        .insert(projectScrapers)
        .values({ ...data, projectId, companyId })
        .returning()
        .then((rows) => rows[0]);
      return toScraper(row);
    },

    removeScraper: async (scraperId: string): Promise<ProjectScraper | null> => {
      const row = await db
        .delete(projectScrapers)
        .where(eq(projectScrapers.id, scraperId))
        .returning()
        .then((rows) => rows[0] ?? null);
      return row ? toScraper(row) : null;
    },
  };
}
