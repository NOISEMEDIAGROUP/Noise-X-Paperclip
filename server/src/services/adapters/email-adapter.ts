// Email adapter - placeholder implementation for now
// Requires installing: npm install resend @react-email/components
import type { NotificationAdapter, ApprovalNotificationOpts } from "../notification-router.js";

export class EmailAdapter implements NotificationAdapter {
  readonly type = "email";

  constructor(private apiKey: string, private fromEmail: string, private toEmail: string) {
  }

  async sendApprovalRequest(opts: ApprovalNotificationOpts): Promise<void> {
    // Placeholder implementation - in real app would send email via Resend
    // with inline approval buttons/links and proper formatting
    console.log(`EMAIL NOTIFICATION: Sending approval request to ${this.toEmail} for approval ${opts.approvalId} (tier: ${opts.riskTier})`);
    // In real implementation:
    // 1. Format HTML email with tier emoji, description, impact summary
    // 2. Include magic links for approve/reject with resolvedVia: 'email'
    // 3. Send via Resend
  }

  async sendMessage(message: string, opts?: Record<string, unknown>): Promise<void> {
    console.log(`EMAIL NOTIFICATION: Sending message to ${this.toEmail}: "${message}"`);
    // In real implementation: send simple text/body as email via Resend
  }
}