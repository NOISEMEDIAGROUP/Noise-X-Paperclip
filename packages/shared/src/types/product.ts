export type ProductStatus = "active" | "paused" | "archived";
export type ProductType = "newsletter" | "saas" | "api" | "mobile_app" | "other";
export type PrimaryChannel = "email" | "web" | "api" | "mobile";

export interface Product {
  id: string;
  companyId: string;
  slug: string;
  name: string;
  description: string | null;
  status: ProductStatus;
  productType: ProductType;
  primaryChannel: PrimaryChannel;
  productUrl: string | null;
  landingPath: string | null;
  healthPath: string | null;
  ownerAgentId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProduct {
  slug: string;
  name: string;
  description?: string | null;
  status?: ProductStatus;
  productType?: ProductType;
  primaryChannel?: PrimaryChannel;
  productUrl?: string | null;
  landingPath?: string | null;
  healthPath?: string | null;
  ownerAgentId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateProduct {
  name?: string;
  description?: string | null;
  status?: ProductStatus;
  productType?: ProductType;
  primaryChannel?: PrimaryChannel;
  productUrl?: string | null;
  landingPath?: string | null;
  healthPath?: string | null;
  ownerAgentId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ProductAnalyticsSummary {
  product: Product;
  subscribers: {
    total: number;
    pending: number;
    paid: number;
    unsubscribed: number;
  };
  revenue: {
    mrrCents: number;
    totalRevenueCents: number;
    recentEvents: Array<{
      id: string;
      amountCents: number;
      eventType: string;
      occurredAt: Date;
    }>;
  };
  users: {
    totalUsers: number;
    paidUsers: number;
    freeUsers: number;
    newSignups: number;
    churned: number;
  };
  health: {
    currentStatus: "healthy" | "degraded" | "down";
    uptimePercent7d: number;
    checks24h: Array<{
      id: string;
      status: string;
      responseTimeMs: number | null;
      checkedAt: Date;
    }>;
  };
}
