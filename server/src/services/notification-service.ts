import type { approvals } from "@paperclipai/db";
import type { NotificationAdapter } from "./notification-router.js";
import type { Db } from "@paperclipai/db";
import { NotificationRouter } from "./notification-router.js";

export function notificationService(db: Db) {
  const router = new NotificationRouter(db);
  
  return {
    getRouter: () => router,
    
    // Method to register notification adapters  
    registerAdapter: (adapter: NotificationAdapter) => {
      router.register(adapter);
    },
    
    // Method to send approval notifications - this can be called from agent-metrics.ts
    sendApprovalNotification: async (
      approval: typeof approvals.$inferSelect,
      companyUrlOrigin: string
    ) => {
      // Don't await this to avoid blocking the calling operation
      // Run in the background as a fire-and-forget operation  
      void router.sendApprovalRequest(approval, companyUrlOrigin);
    },
    
    // Helper to get company URL for building notification links
    async getCompanyUrlOrigin(companyId: string): Promise<string> {
      // In a real implementation, we might look up custom domain or use default
      // For now, assume default Paperclip AI domain; this would come from config/env
      return `https://app.paperclip.ai`; // Would be configurable based on deployment
    }
  };
}