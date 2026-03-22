import { eq, and } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  integrationCatalog,
  integrationRecommendations,
  integrationBlocks,
} from "@paperclipai/db";
import type {
  IntegrationCatalog,
  IntegrationCheckResult,
} from "@paperclipai/shared";

/**
 * Integration requirements for different agent roles and tasks
 */
export const INTEGRATION_REQUIREMENTS: Record<
  string,
  {
    integrationId: string;
    useCase: string;
    isCritical: boolean;
    messageTemplate: string;
  }[]
> = {
  ceo: [
    {
      integrationId: "telegram",
      useCase: "daily_briefs",
      isCritical: false,
      messageTemplate: "CEO needs {integration} to send daily briefs",
    },
    {
      integrationId: "slack",
      useCase: "team_notifications",
      isCritical: false,
      messageTemplate: "CEO needs {integration} for team notifications",
    },
  ],
  cto: [
    {
      integrationId: "github",
      useCase: "code_review",
      isCritical: true,
      messageTemplate: "CTO needs {integration} for code review",
    },
    {
      integrationId: "linear",
      useCase: "issue_tracking",
      isCritical: false,
      messageTemplate: "CTO needs {integration} for issue tracking",
    },
    {
      integrationId: "sentry",
      useCase: "error_tracking",
      isCritical: false,
      messageTemplate: "CTO needs {integration} for error tracking",
    },
  ],
  engineer: [
    {
      integrationId: "github",
      useCase: "code_management",
      isCritical: true,
      messageTemplate: "Engineer needs {integration} for code management",
    },
    {
      integrationId: "linear",
      useCase: "task_management",
      isCritical: false,
      messageTemplate: "Engineer needs {integration} for task management",
    },
  ],
  pm: [
    {
      integrationId: "linear",
      useCase: "project_management",
      isCritical: true,
      messageTemplate: "PM needs {integration} for project management",
    },
    {
      integrationId: "notion",
      useCase: "documentation",
      isCritical: false,
      messageTemplate: "PM needs {integration} for documentation",
    },
    {
      integrationId: "figma",
      useCase: "design_review",
      isCritical: false,
      messageTemplate: "PM needs {integration} for design review",
    },
  ],
  support_lead: [
    {
      integrationId: "zendesk",
      useCase: "customer_support",
      isCritical: true,
      messageTemplate: "Support Lead needs {integration} for customer support",
    },
    {
      integrationId: "intercom",
      useCase: "customer_communication",
      isCritical: false,
      messageTemplate: "Support Lead needs {integration} for customer communication",
    },
  ],
  cfo: [
    {
      integrationId: "stripe",
      useCase: "payment_processing",
      isCritical: true,
      messageTemplate: "CFO needs {integration} for payment processing",
    },
    {
      integrationId: "quickbooks",
      useCase: "accounting",
      isCritical: false,
      messageTemplate: "CFO needs {integration} for accounting",
    },
  ],
};

export function integrationCheckService(db: Db) {
  return {
    /**
     * Check if a company has a specific integration configured
     */
    async hasIntegration(companyId: string, integrationId: string): Promise<boolean> {
      // Check if there's a connected recommendation for this integration
      const [recommendation] = await db
        .select()
        .from(integrationRecommendations)
        .where(
          and(
            eq(integrationRecommendations.companyId, companyId),
            eq(integrationRecommendations.integrationId, integrationId),
            eq(integrationRecommendations.status, "connected")
          )
        )
        .limit(1);

      return !!recommendation;
    },

    /**
     * Check integration requirements for an agent role
     * Returns the first missing critical integration, or null if all are satisfied
     */
    async checkIntegrationRequirements(
      companyId: string,
      agentRole: string,
      taskId?: string,
      taskTitle?: string
    ): Promise<IntegrationCheckResult> {
      const requirements = INTEGRATION_REQUIREMENTS[agentRole] || [];

      for (const requirement of requirements) {
        const hasIntegration = await this.hasIntegration(companyId, requirement.integrationId);
        
        if (!hasIntegration) {
          // Get integration details from catalog
          const [integration] = await db
            .select()
            .from(integrationCatalog)
            .where(eq(integrationCatalog.id, requirement.integrationId))
            .limit(1);

          if (!integration) {
            // Integration not in catalog, skip
            continue;
          }

          // Create or update a block record
          const message = requirement.messageTemplate.replace("{integration}", integration.name);
          
          const [existingBlock] = await db
            .select()
            .from(integrationBlocks)
            .where(
              and(
                eq(integrationBlocks.companyId, companyId),
                eq(integrationBlocks.integrationId, requirement.integrationId),
                eq(integrationBlocks.status, "pending")
              )
            )
            .limit(1);

          let blockId: string;
          if (existingBlock) {
            blockId = existingBlock.id;
          } else {
            const [newBlock] = await db
              .insert(integrationBlocks)
              .values({
                companyId,
                integrationId: requirement.integrationId,
                integrationName: integration.name,
                message,
                isCritical: requirement.isCritical,
                taskId: taskId ?? null,
                taskTitle: taskTitle ?? null,
                status: "pending",
              })
              .returning();
            blockId = newBlock.id;
          }

          return {
            canProceed: !requirement.isCritical,
            reason: "missing_integration",
            missingIntegration: integration as IntegrationCatalog,
            blockId,
          };
        }
      }

      return {
        canProceed: true,
        reason: "all_ok",
      };
    },

    /**
     * Create a recommendation for an integration
     * Called when an agent discovers it needs an integration
     */
    async createRecommendation(
      companyId: string,
      integrationId: string,
      reason: string,
      options?: {
        agentId?: string;
        agentRole?: string;
        taskId?: string;
        taskTitle?: string;
        useCase?: string;
      }
    ): Promise<string> {
      // Get integration details from catalog
      const [integration] = await db
        .select()
        .from(integrationCatalog)
        .where(eq(integrationCatalog.id, integrationId))
        .limit(1);

      if (!integration) {
        throw new Error(`Integration ${integrationId} not found in catalog`);
      }

      // Check for existing pending recommendation
      const [existing] = await db
        .select()
        .from(integrationRecommendations)
        .where(
          and(
            eq(integrationRecommendations.companyId, companyId),
            eq(integrationRecommendations.integrationId, integrationId),
            eq(integrationRecommendations.status, "pending")
          )
        )
        .limit(1);

      if (existing) {
        // Update existing recommendation
        await db
          .update(integrationRecommendations)
          .set({
            reason,
            useCase: options?.useCase ?? existing.useCase,
            taskTitle: options?.taskTitle ?? existing.taskTitle,
            updatedAt: new Date(),
          })
          .where(eq(integrationRecommendations.id, existing.id));
        return existing.id;
      }

      // Create new recommendation
      const [created] = await db
        .insert(integrationRecommendations)
        .values({
          companyId,
          agentId: options?.agentId ?? null,
          agentRole: options?.agentRole ?? null,
          integrationId,
          integrationName: integration.name,
          reason,
          useCase: options?.useCase ?? null,
          priority: 0,
          isFree: integration.isFree,
          isOpenSource: integration.isOpenSource,
          pricingNotes: integration.freeTierLimit ?? integration.paidPrice,
          taskId: options?.taskId ?? null,
          taskTitle: options?.taskTitle ?? null,
          status: "pending",
        })
        .returning();

      return created.id;
    },

    /**
     * Get top 3 integration recommendations for a company
     * Prioritizes: open-source > free tier > paid
     */
    async getTopRecommendations(companyId: string): Promise<IntegrationCatalog[]> {
      const recommendations = await db
        .select({
          integration: integrationCatalog,
        })
        .from(integrationRecommendations)
        .innerJoin(
          integrationCatalog,
          eq(integrationRecommendations.integrationId, integrationCatalog.id)
        )
        .where(
          and(
            eq(integrationRecommendations.companyId, companyId),
            eq(integrationRecommendations.status, "pending")
          )
        )
        .orderBy(integrationRecommendations.priority);

      // Sort by: open-source first, then free tier, then paid
      const sorted = recommendations
        .map((r) => r.integration)
        .sort((a, b) => {
          // Open-source first
          if (a.isOpenSource && !b.isOpenSource) return -1;
          if (!a.isOpenSource && b.isOpenSource) return 1;
          // Then free tier
          if (a.isFree && !b.isFree) return -1;
          if (!a.isFree && b.isFree) return 1;
          return 0;
        });

      return sorted.slice(0, 3) as IntegrationCatalog[];
    },
  };
}