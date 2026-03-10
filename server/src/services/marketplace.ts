import { eq, desc, and, sql, ilike, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  marketplaceCreators,
  marketplaceListings,
  marketplaceVersions,
  marketplacePurchases,
  marketplaceReviews,
  marketplaceStars,
} from "@paperclipai/db";

export function marketplaceService(db: Db) {
  // ── Creators ──────────────────────────────────────────

  async function getOrCreateCreator(userId: string, displayName: string) {
    const existing = await db
      .select()
      .from(marketplaceCreators)
      .where(eq(marketplaceCreators.userId, userId))
      .limit(1);
    if (existing.length > 0) return existing[0];

    const slug = displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const rows = await db
      .insert(marketplaceCreators)
      .values({ userId, displayName, slug })
      .returning();
    return rows[0];
  }

  async function getCreatorBySlug(slug: string) {
    const rows = await db
      .select()
      .from(marketplaceCreators)
      .where(eq(marketplaceCreators.slug, slug))
      .limit(1);
    return rows[0] ?? null;
  }

  // ── Listings ──────────────────────────────────────────

  async function listListings(filters?: {
    type?: string;
    category?: string;
    status?: string;
    search?: string;
    sort?: "popular" | "recent" | "stars";
    limit?: number;
    offset?: number;
  }) {
    const conditions = [eq(marketplaceListings.status, filters?.status ?? "published")];

    if (filters?.type) {
      conditions.push(eq(marketplaceListings.type, filters.type));
    }
    if (filters?.search) {
      conditions.push(
        ilike(marketplaceListings.title, `%${filters.search}%`),
      );
    }

    const orderBy =
      filters?.sort === "stars"
        ? desc(marketplaceListings.starCount)
        : filters?.sort === "recent"
          ? desc(marketplaceListings.createdAt)
          : desc(marketplaceListings.installCount);

    const rows = await db
      .select()
      .from(marketplaceListings)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(filters?.limit ?? 50)
      .offset(filters?.offset ?? 0);

    // Filter by category in-app (jsonb array)
    if (filters?.category) {
      return rows.filter((r) =>
        (r.categories as string[]).includes(filters.category!),
      );
    }
    return rows;
  }

  async function getListingBySlug(slug: string) {
    const rows = await db
      .select()
      .from(marketplaceListings)
      .where(eq(marketplaceListings.slug, slug))
      .limit(1);
    return rows[0] ?? null;
  }

  async function getListingById(id: string) {
    const rows = await db
      .select()
      .from(marketplaceListings)
      .where(eq(marketplaceListings.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async function createListing(data: typeof marketplaceListings.$inferInsert) {
    const rows = await db.insert(marketplaceListings).values(data).returning();
    return rows[0];
  }

  async function updateListing(
    id: string,
    data: Partial<typeof marketplaceListings.$inferInsert>,
  ) {
    const rows = await db
      .update(marketplaceListings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(marketplaceListings.id, id))
      .returning();
    return rows[0] ?? null;
  }

  // ── Versions ──────────────────────────────────────────

  async function listVersions(listingId: string) {
    return db
      .select()
      .from(marketplaceVersions)
      .where(eq(marketplaceVersions.listingId, listingId))
      .orderBy(desc(marketplaceVersions.createdAt));
  }

  async function createVersion(data: typeof marketplaceVersions.$inferInsert) {
    const rows = await db.insert(marketplaceVersions).values(data).returning();
    // Update listing's agent count & adapters from latest version
    await db
      .update(marketplaceListings)
      .set({
        agentCount: data.agentCount,
        compatibleAdapters: data.compatibleAdapters,
        requiredModels: data.requiredModels,
        updatedAt: new Date(),
      })
      .where(eq(marketplaceListings.id, data.listingId));
    return rows[0];
  }

  async function getLatestVersion(listingId: string) {
    const rows = await db
      .select()
      .from(marketplaceVersions)
      .where(eq(marketplaceVersions.listingId, listingId))
      .orderBy(desc(marketplaceVersions.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }

  // ── Purchases / Installs ──────────────────────────────

  async function createPurchase(data: typeof marketplacePurchases.$inferInsert) {
    const rows = await db.insert(marketplacePurchases).values(data).returning();
    // Bump install count
    await db
      .update(marketplaceListings)
      .set({
        installCount: sql`${marketplaceListings.installCount} + 1`,
      })
      .where(eq(marketplaceListings.id, data.listingId));
    return rows[0];
  }

  async function listPurchases(buyerUserId: string) {
    return db
      .select()
      .from(marketplacePurchases)
      .where(eq(marketplacePurchases.buyerUserId, buyerUserId))
      .orderBy(desc(marketplacePurchases.createdAt));
  }

  // ── Stars ─────────────────────────────────────────────

  async function toggleStar(listingId: string, userId: string) {
    const existing = await db
      .select()
      .from(marketplaceStars)
      .where(
        and(
          eq(marketplaceStars.listingId, listingId),
          eq(marketplaceStars.userId, userId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .delete(marketplaceStars)
        .where(eq(marketplaceStars.id, existing[0].id));
      await db
        .update(marketplaceListings)
        .set({ starCount: sql`GREATEST(${marketplaceListings.starCount} - 1, 0)` })
        .where(eq(marketplaceListings.id, listingId));
      return { starred: false };
    }

    await db.insert(marketplaceStars).values({ listingId, userId });
    await db
      .update(marketplaceListings)
      .set({ starCount: sql`${marketplaceListings.starCount} + 1` })
      .where(eq(marketplaceListings.id, listingId));
    return { starred: true };
  }

  async function getUserStars(userId: string, listingIds: string[]) {
    if (listingIds.length === 0) return new Set<string>();
    const rows = await db
      .select({ listingId: marketplaceStars.listingId })
      .from(marketplaceStars)
      .where(
        and(
          eq(marketplaceStars.userId, userId),
          inArray(marketplaceStars.listingId, listingIds),
        ),
      );
    return new Set(rows.map((r) => r.listingId));
  }

  // ── Reviews ───────────────────────────────────────────

  async function listReviews(listingId: string) {
    return db
      .select()
      .from(marketplaceReviews)
      .where(eq(marketplaceReviews.listingId, listingId))
      .orderBy(desc(marketplaceReviews.createdAt));
  }

  async function createReview(data: typeof marketplaceReviews.$inferInsert) {
    const rows = await db.insert(marketplaceReviews).values(data).returning();
    // Update listing rating
    const stats = await db
      .select({
        avg: sql<number>`ROUND(AVG(${marketplaceReviews.rating}) * 10)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(marketplaceReviews)
      .where(eq(marketplaceReviews.listingId, data.listingId));
    if (stats[0]) {
      await db
        .update(marketplaceListings)
        .set({
          ratingAvg: stats[0].avg,
          reviewCount: stats[0].count,
        })
        .where(eq(marketplaceListings.id, data.listingId));
    }
    return rows[0];
  }

  // ── Stats ─────────────────────────────────────────────

  async function getMarketplaceStats() {
    const listingCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(marketplaceListings)
      .where(eq(marketplaceListings.status, "published"));
    const totalInstalls = await db
      .select({ sum: sql<number>`COALESCE(SUM(${marketplaceListings.installCount}), 0)` })
      .from(marketplaceListings);
    const creatorCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(marketplaceCreators);

    return {
      listings: Number(listingCount[0]?.count ?? 0),
      installs: Number(totalInstalls[0]?.sum ?? 0),
      creators: Number(creatorCount[0]?.count ?? 0),
    };
  }

  return {
    getOrCreateCreator,
    getCreatorBySlug,
    listListings,
    getListingBySlug,
    getListingById,
    createListing,
    updateListing,
    listVersions,
    createVersion,
    getLatestVersion,
    createPurchase,
    listPurchases,
    toggleStar,
    getUserStars,
    listReviews,
    createReview,
    getMarketplaceStats,
  };
}
