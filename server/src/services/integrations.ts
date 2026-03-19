import type { SprintPlannerService } from "./sprint-planner.js";
import type { TeamsOutboundService } from "./teams-outbound.js";
import { logger } from "../middleware/logger.js";

interface IssueRef {
  id: string;
  identifier: string | null;
  title: string;
  status: string;
  companyPrefix: string;
  metadata?: Record<string, unknown> | null;
}

interface AgentRef {
  id: string;
  name: string;
  urlKey?: string;
}

interface ApprovalRef {
  id: string;
  type: string;
  description?: string | null;
  companyId: string;
  companyPrefix: string;
}

/** Extract `sprintPlannerTaskId` from issue metadata, if present. */
function getSpTaskId(metadata: Record<string, unknown> | null | undefined): string | undefined {
  if (!metadata) return undefined;
  const val = metadata.sprintPlannerTaskId;
  return typeof val === "string" ? val : undefined;
}

/**
 * Integration service — lifecycle hooks that bridge Paperclip events to
 * external systems (sprint planner, Teams notifications).
 *
 * All methods are fire-and-forget safe: errors are logged but never thrown.
 */
export function integrationsService(deps: {
  sprintPlanner?: SprintPlannerService | null;
  teamsOutbound?: TeamsOutboundService | null;
}) {
  const { sprintPlanner, teamsOutbound } = deps;

  return {
    /**
     * Called after an issue status changes. Syncs to the mapped sprint planner
     * task (if mapping exists in issue metadata) and sends Teams notifications.
     */
    onIssueStatusChanged: async (
      issue: IssueRef,
      oldStatus: string,
      newStatus: string,
      actor: AgentRef | null,
    ) => {
      try {
        const spTaskId = getSpTaskId(issue.metadata);

        // Auto-update mapped SP task
        if (sprintPlanner && spTaskId) {
          const statusMap: Record<string, string> = {
            in_progress: "in-progress",
            in_review: "review",
            done: "done",
            blocked: "blocked",
            cancelled: "cancelled",
          };
          const mappedStatus = statusMap[newStatus];
          if (mappedStatus) {
            await sprintPlanner
              .updateTaskStatus(spTaskId, mappedStatus, `[Paperclip] ${issue.identifier} → ${newStatus}`)
              .catch((err) =>
                logger.warn({ err, spTaskId, issueId: issue.id }, "Failed to sync SP task status"),
              );
          }
        }

        // Teams notifications
        if (teamsOutbound && actor) {
          if (newStatus === "done") {
            await teamsOutbound
              .sendCompletionCard(issue, actor)
              .catch((err) => logger.warn({ err, issueId: issue.id }, "Failed to send completion card"));
          }
          if (newStatus === "blocked") {
            const reason = "See Paperclip for details";

            // Send blocker card and SP comment in parallel
            await Promise.all([
              teamsOutbound
                .sendBlockerCard(issue, actor, reason)
                .catch((err) => logger.warn({ err, issueId: issue.id }, "Failed to send blocker card")),
              sprintPlanner && spTaskId
                ? sprintPlanner
                    .addTaskComment(spTaskId, `[Paperclip] Blocked: ${issue.identifier} — see Paperclip for details`)
                    .catch((err) =>
                      logger.warn({ err, spTaskId, issueId: issue.id }, "Failed to add SP task blocker comment"),
                    )
                : Promise.resolve(),
            ]);
          }
        }
      } catch (err) {
        logger.warn({ err, issueId: issue.id, oldStatus, newStatus }, "Integration hook error: onIssueStatusChanged");
      }
    },

    /**
     * Called after an approval is created. Creates a SP ticket for the reviewer
     * and sends a Teams notification.
     */
    onApprovalCreated: async (approval: ApprovalRef, actor: AgentRef | null) => {
      try {
        let spTicket: { id: string; title: string } | undefined;

        if (sprintPlanner) {
          spTicket = await sprintPlanner
            .createTicket({
              title: `Approval needed: ${approval.type}`,
              description: approval.description ?? `Approval ${approval.id} requires review`,
              priority: "high",
              category: "general",
            })
            .catch((err) => {
              logger.warn({ err, approvalId: approval.id }, "Failed to create SP ticket for approval");
              return undefined;
            });
        }

        if (teamsOutbound) {
          await teamsOutbound
            .sendApprovalCard(approval, spTicket)
            .catch((err) => logger.warn({ err, approvalId: approval.id }, "Failed to send approval card"));
        }
      } catch (err) {
        logger.warn({ err, approvalId: approval.id }, "Integration hook error: onApprovalCreated");
      }
    },
  };
}

export type IntegrationsService = ReturnType<typeof integrationsService>;
