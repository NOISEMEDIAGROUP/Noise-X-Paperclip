import type { NotificationAdapter, ApprovalNotificationOpts } from "../notification-router.js";

export interface WebhookAdapterOptions {
  readonly type: "webhook";
  webhookUrl: string;
  headers?: Record<string, string>; // Additional headers to send with request
  format: "paperclip-standard" | "activepieces" | "zapier" | "custom"; // Target integration format
}

export class WebhookAdapter implements NotificationAdapter {
  readonly type = "webhook";

  constructor(private options: WebhookAdapterOptions) {}

  async sendApprovalRequest(opts: ApprovalNotificationOpts): Promise<void> {
    let payload: unknown;
    switch (this.options.format) {
      case "activepieces":
        payload = {
          event: "approval_required",
          approvalId: opts.approvalId,
          description: opts.description,
          impactSummary: opts.impactSummary,
          riskTier: opts.riskTier,
          autoApproveAt: opts.autoApproveAt,
          decisionUrls: {
            approve: `${opts.approveUrl}?decision=approved&via=webhook`,
            reject: `${opts.rejectUrl}?decision=rejected&via=webhook`,
          },
          occurredAt: new Date().toISOString(),
        };
        break;
      
      case "zapier":
        payload = {
          action: "needs_approval",
          id: opts.approvalId,
          summary: opts.description,
          details: {
            impact: opts.impactSummary,
            tier: opts.riskTier,
            autoApproveAt: opts.autoApproveAt?.toISOString(),
            approve_url: `${opts.approveUrl}?decision=approved&via=webhook`,
            reject_url: `${opts.rejectUrl}?decision=rejected&via=webhook`,
          },
          timestamp: new Date().toISOString(),
        };
        break;

      case "paperclip-standard":
        payload = {
          event: "approval_requested",
          approval: {
            id: opts.approvalId,
            type: "action_approval",
            title: opts.description,
            summary: opts.impactSummary,
            riskTier: opts.riskTier,
            autoApproveAt: opts.autoApproveAt,
            resolveUrl: opts.approveUrl, // Base URL to which decision can be sent
          },
        };
        break;
      
      case "custom":
      default:
        // Use paperclip-standard format by default for custom if not specified
        payload = {
          event: "approval_requested",
          approvalId: opts.approvalId,
          title: opts.description,
          summary: opts.impactSummary,
          riskTier: opts.riskTier,
          autoApproveAt: opts.autoApproveAt,
          urls: {
            approve: opts.approveUrl,
            reject: opts.rejectUrl,
          }
        };
    }

    const config = {
      method: "POST",
      headers: {
        ...this.options.headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    };

    try {
      const response = await fetch(this.options.webhookUrl, config);
      
      if (!response.ok) {
        throw new Error(`Webhook responded with status ${response.status}: ${await response.text()}`);
      }
    } catch (error) {
      // In a real implementation, consider saving failed webhooks for retry
      console.error(`Failed to send webhook to ${this.options.webhookUrl}:`, error);
      throw error; // or just log and don't fail depending on requirements
    }
  }

  async sendMessage(message: string, opts?: Record<string, unknown>): Promise<void> {
    const payload = {
      event: "notification",
      timestamp: new Date().toISOString(),
      message: message,
      metadata: opts || {},
    };

    const config = {
      method: "POST",
      headers: {
        ...this.options.headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    };

    const response = await fetch(this.options.webhookUrl, config);
    
    if (!response.ok) {
      throw new Error(`Webhook responded with status ${response.status}: ${await response.text()}`);
    }
  }
}