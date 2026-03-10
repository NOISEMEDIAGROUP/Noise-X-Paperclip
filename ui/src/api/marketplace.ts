const BASE = "/api/marketplace";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export interface MarketplaceListing {
  id: string;
  creatorId: string;
  slug: string;
  type: string;
  title: string;
  tagline: string | null;
  description: string | null;
  readmeMarkdown: string | null;
  priceCents: number;
  currency: string;
  categories: string[];
  tags: string[];
  agentCount: number | null;
  previewImages: string[];
  compatibleAdapters: string[];
  requiredModels: string[];
  installCount: number;
  starCount: number;
  ratingAvg: number | null;
  reviewCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceVersion {
  id: string;
  listingId: string;
  version: string;
  changelog: string | null;
  agentCount: number | null;
  createdAt: string;
}

export interface MarketplaceReview {
  id: string;
  authorDisplayName: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
}

export interface MarketplaceListingDetail extends MarketplaceListing {
  versions: MarketplaceVersion[];
  reviews: MarketplaceReview[];
}

export interface MarketplaceStats {
  listings: number;
  installs: number;
  creators: number;
}

export const marketplaceApi = {
  listListings: (params?: {
    type?: string;
    category?: string;
    search?: string;
    sort?: string;
  }): Promise<MarketplaceListing[]> => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set("type", params.type);
    if (params?.category) qs.set("category", params.category);
    if (params?.search) qs.set("search", params.search);
    if (params?.sort) qs.set("sort", params.sort);
    const q = qs.toString();
    return fetch(`${BASE}/listings${q ? `?${q}` : ""}`, { credentials: "include" }).then((r) =>
      json<MarketplaceListing[]>(r),
    );
  },

  getListing: (slug: string): Promise<MarketplaceListingDetail> =>
    fetch(`${BASE}/listings/${slug}`, { credentials: "include" }).then((r) =>
      json<MarketplaceListingDetail>(r),
    ),

  getStats: (): Promise<MarketplaceStats> =>
    fetch(`${BASE}/stats`, { credentials: "include" }).then((r) =>
      json<MarketplaceStats>(r),
    ),

  installListing: (id: string, targetCompanyId?: string): Promise<{ success: boolean; companyId?: string }> =>
    fetch(`${BASE}/listings/${id}/install`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetCompanyId }),
    }).then((r) => json(r)),

  toggleStar: (id: string): Promise<{ starred: boolean }> =>
    fetch(`${BASE}/listings/${id}/star`, {
      method: "POST",
      credentials: "include",
    }).then((r) => json(r)),

  createListing: (data: Partial<MarketplaceListing> & { creatorName?: string }): Promise<MarketplaceListing> =>
    fetch(`${BASE}/listings`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => json(r)),
};
