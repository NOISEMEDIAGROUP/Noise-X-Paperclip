import { logger } from "../middleware/logger.js";

export interface TeamsOutboundConfig {
  webhookUrl: string;
  publicUrl: string;
}

/**
 * Teams outbound notification service.
 * Sends short Adaptive Cards via Power Automate webhook.
 */
export function teamsOutboundService(config: TeamsOutboundConfig) {
  const { webhookUrl, publicUrl } = config;

  async function sendCard(card: Record<string, unknown>): Promise<void> {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        logger.warn({ status: res.status, body }, "Teams webhook failed");
      }
    } catch (err) {
      logger.warn({ err }, "Teams webhook request error");
    }
  }

  function issueUrl(identifier: string | null, companyPrefix: string): string {
    return `${publicUrl}/${companyPrefix}/issues/${identifier ?? "unknown"}`;
  }

  function approvalUrl(approvalId: string, companyPrefix: string): string {
    return `${publicUrl}/${companyPrefix}/approvals/${approvalId}`;
  }

  function agentUrl(agentUrlKey: string, companyPrefix: string): string {
    return `${publicUrl}/${companyPrefix}/agents/${agentUrlKey}`;
  }

  return {
    sendCompletionCard: async (issue: {
      id: string;
      identifier: string | null;
      title: string;
      companyPrefix: string;
    }, agent: { name: string; urlKey?: string }) => {
      const prefix = issue.companyPrefix;
      await sendCard({
        type: "message",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
              $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
              type: "AdaptiveCard",
              version: "1.4",
              body: [
                {
                  type: "TextBlock",
                  text: `Task completed: ${issue.identifier}`,
                  weight: "Bolder",
                  size: "Medium",
                },
                {
                  type: "TextBlock",
                  text: `**${agent.name}** completed **${issue.title}**`,
                  wrap: true,
                },
              ],
              actions: [
                {
                  type: "Action.OpenUrl",
                  title: "View Issue",
                  url: issueUrl(issue.identifier, prefix),
                },
              ],
            },
          },
        ],
      });
    },

    sendBlockerCard: async (issue: {
      id: string;
      identifier: string | null;
      title: string;
      companyPrefix: string;
    }, agent: { name: string }, reason: string) => {
      const prefix = issue.companyPrefix;
      await sendCard({
        type: "message",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
              $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
              type: "AdaptiveCard",
              version: "1.4",
              body: [
                {
                  type: "TextBlock",
                  text: `Blocker: ${issue.identifier}`,
                  weight: "Bolder",
                  size: "Medium",
                  color: "Attention",
                },
                {
                  type: "TextBlock",
                  text: `**${agent.name}** is blocked on **${issue.title}**`,
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: reason,
                  wrap: true,
                  size: "Small",
                },
              ],
              actions: [
                {
                  type: "Action.OpenUrl",
                  title: "View Issue",
                  url: issueUrl(issue.identifier, prefix),
                },
              ],
            },
          },
        ],
      });
    },

    sendApprovalCard: async (approval: {
      id: string;
      type: string;
      description?: string | null;
      companyId: string;
      companyPrefix: string;
    }, spTicket?: { id: string; title: string }) => {
      const prefix = approval.companyPrefix;
      const actions: Array<Record<string, unknown>> = [
        {
          type: "Action.OpenUrl",
          title: "Review in Paperclip",
          url: approvalUrl(approval.id, prefix),
        },
      ];
      if (spTicket) {
        actions.push({
          type: "Action.OpenUrl",
          title: "View SP Ticket",
          url: `${config.publicUrl}/tickets/${spTicket.id}`,
        });
      }
      await sendCard({
        type: "message",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
              $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
              type: "AdaptiveCard",
              version: "1.4",
              body: [
                {
                  type: "TextBlock",
                  text: `Approval needed: ${approval.type}`,
                  weight: "Bolder",
                  size: "Medium",
                  color: "Warning",
                },
                ...(approval.description
                  ? [
                      {
                        type: "TextBlock",
                        text: approval.description,
                        wrap: true,
                        size: "Small",
                      },
                    ]
                  : []),
              ],
              actions,
            },
          },
        ],
      });
    },

    sendAgentPausedCard: async (agent: {
      name: string;
      urlKey?: string;
      companyPrefix: string;
    }, reason: string) => {
      const prefix = agent.companyPrefix;
      await sendCard({
        type: "message",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
              $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
              type: "AdaptiveCard",
              version: "1.4",
              body: [
                {
                  type: "TextBlock",
                  text: `Agent paused: ${agent.name}`,
                  weight: "Bolder",
                  size: "Medium",
                  color: "Warning",
                },
                {
                  type: "TextBlock",
                  text: reason,
                  wrap: true,
                  size: "Small",
                },
              ],
              actions: agent.urlKey
                ? [
                    {
                      type: "Action.OpenUrl",
                      title: "View Agent",
                      url: agentUrl(agent.urlKey, prefix),
                    },
                  ]
                : [],
            },
          },
        ],
      });
    },
  };
}

export type TeamsOutboundService = ReturnType<typeof teamsOutboundService>;
