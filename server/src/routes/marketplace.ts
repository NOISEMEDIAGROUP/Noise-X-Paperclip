import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { marketplaceService } from "../services/marketplace.js";
import { companyPortabilityService } from "../services/company-portability.js";
import { assertBoard } from "./authz.js";

export function marketplaceRoutes(db: Db) {
  const router = Router();
  const svc = marketplaceService(db);
  const portability = companyPortabilityService(db);

  // ── Public: Browse & Search ───────────────────────────

  router.get("/listings", async (req, res) => {
    const { type, category, search, sort, limit, offset } = req.query;
    const listings = await svc.listListings({
      type: type as string | undefined,
      category: category as string | undefined,
      search: search as string | undefined,
      sort: (sort as "popular" | "recent" | "stars") ?? "popular",
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    res.json(listings);
  });

  router.get("/listings/:slug", async (req, res) => {
    const listing = await svc.getListingBySlug(req.params.slug);
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const versions = await svc.listVersions(listing.id);
    const reviews = await svc.listReviews(listing.id);
    res.json({ ...listing, versions, reviews });
  });

  router.get("/stats", async (_req, res) => {
    const stats = await svc.getMarketplaceStats();
    res.json(stats);
  });

  // ── Creator Management ────────────────────────────────

  router.get("/creators/:slug", async (req, res) => {
    const creator = await svc.getCreatorBySlug(req.params.slug);
    if (!creator) {
      res.status(404).json({ error: "Creator not found" });
      return;
    }
    const listings = await svc.listListings({ status: "published" });
    const creatorListings = listings.filter((l) => l.creatorId === creator.id);
    res.json({ ...creator, listings: creatorListings });
  });

  // ── Authenticated: Publish & Manage ───────────────────

  router.post("/listings", async (req, res) => {
    assertBoard(req);
    const userId = req.actor?.userId ?? "local";
    const creator = await svc.getOrCreateCreator(
      userId,
      req.body.creatorName ?? "Anonymous",
    );
    const listing = await svc.createListing({
      ...req.body,
      creatorId: creator.id,
    });
    res.status(201).json(listing);
  });

  router.patch("/listings/:id", async (req, res) => {
    assertBoard(req);
    const listing = await svc.updateListing(req.params.id, req.body);
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    res.json(listing);
  });

  // ── Versions ──────────────────────────────────────────

  router.get("/listings/:id/versions", async (req, res) => {
    const versions = await svc.listVersions(req.params.id);
    res.json(versions);
  });

  router.post("/listings/:id/versions", async (req, res) => {
    assertBoard(req);
    const version = await svc.createVersion({
      listingId: req.params.id,
      ...req.body,
    });
    res.status(201).json(version);
  });

  // ── Install (import blueprint into a company) ─────────

  router.post("/listings/:id/install", async (req, res) => {
    assertBoard(req);
    const listing = await svc.getListingById(req.params.id);
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const latestVersion = await svc.getLatestVersion(listing.id);
    if (!latestVersion) {
      res.status(400).json({ error: "No published version" });
      return;
    }

    const manifest = latestVersion.manifest;
    const userId = req.actor?.userId ?? "local";

    // Use existing portability import to create company from manifest
    const targetCompanyId = req.body.targetCompanyId as string | undefined;
    const importPayload = {
      source: {
        type: "inline" as const,
        manifest: manifest as any,
        files: {} as Record<string, string>,
      },
      target: targetCompanyId
        ? { mode: "existing_company" as const, companyId: targetCompanyId }
        : { mode: "new_company" as const },
    };

    try {
      const result = await portability.importBundle(importPayload, userId);

      // Record the purchase/install
      await svc.createPurchase({
        listingId: listing.id,
        versionId: latestVersion.id,
        buyerUserId: userId,
        buyerCompanyId: result.company?.id ?? targetCompanyId,
        pricePaidCents: listing.priceCents,
        status: "completed",
        installedAt: new Date(),
      });

      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({
        error: "Install failed",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // ── Stars ─────────────────────────────────────────────

  router.post("/listings/:id/star", async (req, res) => {
    assertBoard(req);
    const userId = req.actor?.userId ?? "local";
    const result = await svc.toggleStar(req.params.id, userId);
    res.json(result);
  });

  // ── Reviews ───────────────────────────────────────────

  router.get("/listings/:id/reviews", async (req, res) => {
    const reviews = await svc.listReviews(req.params.id);
    res.json(reviews);
  });

  router.post("/listings/:id/reviews", async (req, res) => {
    assertBoard(req);
    const userId = req.actor?.userId ?? "local";
    const review = await svc.createReview({
      listingId: req.params.id,
      authorUserId: userId,
      authorDisplayName: req.body.authorDisplayName ?? "Anonymous",
      rating: req.body.rating,
      title: req.body.title,
      body: req.body.body,
      verifiedPurchase: false,
    });
    res.status(201).json(review);
  });

  // ── Purchases ─────────────────────────────────────────

  router.get("/purchases", async (req, res) => {
    assertBoard(req);
    const userId = req.actor?.userId ?? "local";
    const purchases = await svc.listPurchases(userId);
    res.json(purchases);
  });

  return router;
}
