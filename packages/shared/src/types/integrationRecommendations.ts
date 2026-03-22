// ============================================================================
// Integration Catalog - Master list of supported integrations
// ============================================================================

export type IntegrationCategory = 
  | "notifications" 
  | "payments" 
  | "development" 
  | "monitoring" 
  | "analytics";

export type SetupDifficulty = "easy" | "medium" | "hard";

export interface IntegrationCatalog {
  id: string; // 'telegram', 'stripe', 'github', etc.
  name: string;
  description: string | null;
  icon: string | null; // lucide icon name
  category: IntegrationCategory;
  
  // Pricing info
  isFree: boolean;
  isOpenSource: boolean;
  freeTierLimit: string | null; // "10 users", "1000 emails/month"
  paidPrice: string | null; // "$7.75/user/month"
  paidUrl: string | null; // pricing page URL
  
  // Setup info
  setupTimeMinutes: number;
  setupDifficulty: SetupDifficulty;
  
  // Capabilities
  capabilities: string[];
  usedByAgents: string[]; // ['ceo', 'pm', 'support_lead']
  
  // Config reference
  configId: string | null;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Integration Recommendations - Suggestions from agents
// ============================================================================

export type RecommendationStatus = "pending" | "dismissed" | "connected";

export interface IntegrationRecommendation {
  id: string;
  companyId: string;
  
  // Who recommended this
  agentId: string | null;
  agentRole: string | null; // 'ceo', 'pm', 'cto', etc.
  
  // What integration
  integrationId: string;
  integrationName: string;
  
  // Why recommended
  reason: string; // "for daily briefs", "for error tracking"
  useCase: string | null; // "daily_briefs", "error_tracking", "payments"
  
  // Priority and pricing info (cached from catalog)
  priority: number; // 0 = high priority
  isFree: boolean;
  isOpenSource: boolean;
  pricingNotes: string | null;
  
  // Context
  taskId: string | null;
  taskTitle: string | null;
  
  // Status
  status: RecommendationStatus;
  connectedAt: Date | null;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Integration Blocks - When agent is blocked by missing integration
// ============================================================================

export type BlockStatus = "pending" | "dismissed" | "resolved";

export interface IntegrationBlock {
  id: string;
  companyId: string;
  
  // What was blocked
  agentId: string | null;
  agentRole: string | null;
  taskId: string | null;
  taskTitle: string | null;
  
  // What integration was needed
  integrationId: string;
  integrationName: string;
  
  // Message to user (clear, simple)
  message: string; // "CEO needs Telegram to send daily briefs"
  
  // Severity
  isCritical: boolean; // true = modal, false = banner
  
  // Resolution
  status: BlockStatus;
  resolvedAt: Date | null;
  resolvedBy: string | null; // 'user_setup', 'user_skip', 'agent_alternative'
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateRecommendationRequest {
  integrationId: string;
  integrationName: string;
  reason: string;
  useCase?: string;
  isFree: boolean;
  isOpenSource?: boolean;
  pricingNotes?: string;
  priority?: number;
  taskId?: string;
  taskTitle?: string;
}

export interface GetRecommendationsResponse {
  pending: IntegrationRecommendation[];
  connected: IntegrationRecommendation[];
  dismissed: IntegrationRecommendation[];
}

export interface GetBlocksResponse {
  blocks: IntegrationBlock[];
}

export interface GetCatalogResponse {
  integrations: IntegrationCatalog[];
}

// ============================================================================
// Integration Check Result
// ============================================================================

export interface IntegrationCheckResult {
  canProceed: boolean;
  reason?: "missing_integration" | "all_ok";
  missingIntegration?: IntegrationCatalog;
  blockId?: string;
}