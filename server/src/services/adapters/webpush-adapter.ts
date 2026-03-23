// WebPush adapter - placeholder implementation for now
// Later will need: npm install web-push
import type { NotificationAdapter, ApprovalNotificationOpts } from "../notification-router.js";

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface WebPushAdapterOptions {
  readonly type: "webpush";
  subscription: PushSubscription;
  vapidSubject: string; 
  vapidPublicKey: string;
  vapidPrivateKey: string;
}

export class WebPushAdapter implements NotificationAdapter {
  readonly type = "webpush";

  constructor(private options: WebPushAdapterOptions) {
  }

  async sendApprovalRequest(opts: ApprovalNotificationOpts): Promise<void> {
    // Placeholder implementation - in real app would send web push notification
    // with the subscription details and the approval request info
    console.log(`WEBPUSH NOTIFICATION: Sending approval request to subscription for approval ${opts.approvalId} (tier: ${opts.riskTier})`);
    // In real implementation:
    // 1. Format notification payload with title, body, icon, badge, and data
    // 2. Send via web-push library to the push subscription
    // 3. Handle delivery failures and subscription expiration
  }

  async sendMessage(message: string, opts?: Record<string, unknown>): Promise<void> {
    console.log(`WEBPUSH NOTIFICATION: Sending message: "${message}"`);
    // In real implementation: send push notification message to subscriber
  }
}