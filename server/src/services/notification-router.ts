import type { approvals } from "@paperclipai/db";
import type { Db } from "@paperclipai/db";

// Adapter interface for different notification channels
export interface NotificationAdapter {
  readonly type: string;
  sendApprovalRequest(opts: ApprovalNotificationOpts): Promise<void>;
  sendMessage(message: string, opts?: Record<string, unknown>): Promise<void>;
}

export interface ApprovalNotificationOpts {
  approvalId: string;
  description: string;
  impactSummary: string;
  riskTier: "green" | "yellow" | "red";
  autoApproveAt?: Date | null;
  approveUrl: string;   // https://app.paperclip.ai/api/approvals/:id for direct resolve
  rejectUrl: string;
}

export class NotificationRouter {
  protected adapters: Map<string, NotificationAdapter> = new Map();
  private db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  register(adapter: NotificationAdapter) {
    this.adapters.set(adapter.type, adapter);
  }

  /**
   * Send approval request notifications to all registered channels
   */
  async sendApprovalRequest(
    approval: typeof approvals.$inferSelect,
    companyUrlOrigin: string
  ): Promise<void> {
    const notificationOpts: ApprovalNotificationOpts = {
      approvalId: approval.id,
      description: this.formatDescription(approval),
      impactSummary: this.extractImpactSummary(approval),
      riskTier: (approval.riskTier || "yellow") as "green" | "yellow" | "red",  // Default to yellow if not set
      autoApproveAt: approval.autoApproveAt ?? null,
      approveUrl: `${companyUrlOrigin.replace(/\/$/, '')}/api/approvals/${approval.id}`,
      rejectUrl: `${companyUrlOrigin.replace(/\/$/, '')}/api/approvals/${approval.id}`,
    };

    // Special handling for Telegram (using existing service)
    const promises = [];

    // Handle Telegram notifications specially through existing service
    // Import dynamically to prevent circular dependency issues 
    const { telegramNotifierService } = await import("./telegram-notifier.js");
    const telegramNotifier = telegramNotifierService(this.db);
    
    promises.push(
      telegramNotifier.sendApprovalRequest(approval.companyId, {
        approvalId: approval.id,
        description: this.formatDescription(approval),
        impactSummary: this.extractImpactSummary(approval),
        riskTier: approval.riskTier || "yellow",  // Use safe default for typing
        autoApproveAt: approval.autoApproveAt ?? null
      }).catch(err => {
        console.error("Failed to send telegram approval request:", err);
      })
    );

    // Other adapters
    for (const adapter of this.adapters.values()) {
      promises.push(
        adapter.sendApprovalRequest(notificationOpts).catch(err => {
          console.error(`Failed to send ${adapter.type} approval request:`, err);
        })
      );
    }

    // Run all channels simultaneously, but continue if one Adapter fails
    await Promise.allSettled(promises);
  }

  private formatDescription(approval: typeof approvals.$inferSelect): string {
    const agentActionMap: Record<string, string> = {
      code_fix: "Fix a code issue",
      write_test: "Write a test case",
      write_doc: "Update documentation", 
      read_analytics: "Analyze user metrics",
      read_revenue: "Analyze revenue data",
      staging_deploy: "Deploy to staging",
      dependency_update: "Update dependency",
      social_post_draft: "Draft social media post",
      social_post_publish: "Publish social media post",
      email_campaign: "Send email campaign",
      production_deploy: "Deploy to production",
      user_data_change: "Change user data",
      paid_integration: "Connect paid integration",
      pricing_change: "Change subscription pricing",
      crypto_payout: "Process cryptocurrency payout",
      deletion_data: "Delete user data",
    };
    
    // Get description from payload first
    const payloadDescription = approval.payload?.description as string;
    if (payloadDescription) return payloadDescription;
    
    // Look for "description" in the generic payload content
    const genericDescription = approval.payload?.['description'] as string;
    if (genericDescription) return genericDescription; 
    
    // Safely access the actionType field and use it to map to description
    if (approval.actionType) {
      const description = agentActionMap[approval.actionType];
      if (description) return description;
    }
    
    // Fall back to using the approval type itself
    return `Request approval for ${approval.type || 'action'}`;
  }

  private extractImpactSummary(approval: typeof approvals.$inferSelect): string {
    // Extract impact summary from various potential sources in the payload first
    // The DB doesn't have a direct 'impactSummary' column, so this comes from payload
    
    const payloadImpactSummary = approval.payload?.impactSummary as string;
    if (payloadImpactSummary) return payloadImpactSummary;
    
    const payloadSummary = approval.payload?.summary as string;
    if (payloadSummary) return payloadSummary;

    // If not in payload, look for a generic one
    const genericImpactSummary = approval.payload?.['impactSummary'] as string;
    if (genericImpactSummary) return genericImpactSummary;
    
    // Fallback description
    return `This change may affect your business operations for company ${approval.companyId}`;
  }
}