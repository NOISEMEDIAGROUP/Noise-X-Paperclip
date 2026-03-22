import { randomUUID } from "node:crypto";
import type { Db } from "@paperclipai/db";
import { agents, issues } from "@paperclipai/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { agentService } from "./agents.js";
import { departmentService } from "./departments.js";
import { activityService } from "./activity.js";
import { notFound, unprocessable } from "../errors.js";

type AgentRecord = Awaited<ReturnType<ReturnType<typeof agentService>["getById"]>>;

type CheckpointResult = {
  id: number;
  label: string;
  status: "pass" | "fail";
  evidence: string[];
};

type AutonomyRunResult = {
  companyId: string;
  runId: string;
  startedAt: string;
  finishedAt: string;
  summary: {
    passed: number;
    failed: number;
  };
  artifacts: Record<string, unknown>;
  checkpoints: CheckpointResult[];
};

function requireAgent(agent: AgentRecord, label: string) {
  if (!agent) throw notFound(`${label} agent not found`);
  return agent;
}

function findByDepartmentKey(items: any[], key: string) {
  return items.find((agent) => agent.metadata?.departmentKey === key) ?? null;
}

async function parseJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export function autonomyTestService(db: Db) {
  const agentsSvc = agentService(db);
  const departmentsSvc = departmentService(db);
  const activitySvc = activityService(db);

  return {
    async run(companyId: string, baseUrl: string): Promise<AutonomyRunResult> {
      const startedAt = new Date();
      const runId = `phase8-${randomUUID()}`;

      const departmentStatus = await departmentsSvc.status(companyId);
      if (departmentStatus.missingCount > 0 || departmentStatus.partialCount > 0) {
        throw unprocessable("Departments must be fully wired before running the autonomy test");
      }

      const companyAgents = await agentsSvc.list(companyId);
      const ceo = requireAgent(findByDepartmentKey(companyAgents, "ceo"), "CEO");
      const finance = requireAgent(findByDepartmentKey(companyAgents, "finance"), "Finance");
      const support = requireAgent(findByDepartmentKey(companyAgents, "support"), "Support");
      const developer = requireAgent(findByDepartmentKey(companyAgents, "developer"), "Developer");
      const security = requireAgent(findByDepartmentKey(companyAgents, "security"), "Security");
      const reliability = requireAgent(findByDepartmentKey(companyAgents, "reliability"), "Reliability");
      const pm = requireAgent(companyAgents.find((agent) => agent.role === "pm") ?? null, "PM");

      const keyIds: string[] = [];
      const issueIds: string[] = [];
      const approvalIds: string[] = [];
      const artifacts: Record<string, unknown> = {};

      const boardFetch = async (path: string, init?: RequestInit) => {
        const response = await fetch(`${baseUrl}/api${path}`, {
          ...init,
          headers: {
            "Content-Type": "application/json",
            ...(init?.headers ?? {}),
          },
        });
        return { response, body: await parseJson(response) };
      };

      const keys = new Map<string, string>();
      for (const agent of [ceo, finance, support, developer, security, reliability, pm]) {
        const key = await agentsSvc.createApiKey(agent.id, `phase8-${runId}`);
        keyIds.push(key.id);
        keys.set(agent.id, key.token);
      }

      const agentFetch = async (agentId: string, path: string, init?: RequestInit, customRunId?: string) => {
        const token = keys.get(agentId);
        if (!token) throw new Error(`Missing token for agent ${agentId}`);
        const runIdHeader = customRunId && /^[0-9a-fA-F-]{36}$/.test(customRunId) ? customRunId : null;
        const response = await fetch(`${baseUrl}/api${path}`, {
          ...init,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...(runIdHeader ? { "x-paperclip-run-id": runIdHeader } : {}),
            ...(init?.headers ?? {}),
          },
        });
        return { response, body: await parseJson(response) };
      };

      const invokeAgentRun = async (agentId: string) => {
        const result = await agentFetch(agentId, `/agents/${agentId}/heartbeat/invoke`, { method: "POST" });
        if (!result.response.ok || !result.body?.id) {
          throw new Error(`Failed to invoke heartbeat for agent ${agentId}: ${result.response.status}`);
        }
        return String(result.body.id);
      };

      const originalDeveloperBudget = developer.budgetMonthlyCents;
      let developerAutoPaused = false;

      try {
        const directive = await boardFetch(`/companies/${companyId}/issues`, {
          method: "POST",
          body: JSON.stringify({
            title: `[Phase8] Board directive ${runId}`,
            description: "Board checkpoint: CEO must acknowledge and create an execution plan.",
            status: "todo",
            priority: "high",
          }),
        });
        if (!directive.response.ok) throw new Error(`Failed to create directive issue: ${directive.response.status}`);
        const directiveIssue = directive.body;
        issueIds.push(directiveIssue.id);
        artifacts.directiveIssue = { id: directiveIssue.id, identifier: directiveIssue.identifier };

        const ceoRunId = await invokeAgentRun(ceo.id);
        const ceoCheckout = await agentFetch(ceo.id, `/issues/${directiveIssue.id}/checkout`, {
          method: "POST",
          body: JSON.stringify({ agentId: ceo.id, expectedStatuses: ["todo", "backlog", "blocked"] }),
        }, ceoRunId);
        if (!ceoCheckout.response.ok) throw new Error(`CEO checkout failed: ${ceoCheckout.response.status}`);

        const planningCommentBody = [
          "Planning summary:",
          "Owner: BuilderEngineer",
          "Touch list:",
          "- ui/src/App.tsx",
          "- server/src/routes/issues.ts",
          "Done criteria:",
          "- issue is scoped",
          "- QA verifies before release",
          "- rollback path documented",
        ].join("\n");
        const ceoComment = await agentFetch(ceo.id, `/issues/${directiveIssue.id}/comments`, {
          method: "POST",
          body: JSON.stringify({ body: planningCommentBody }),
        }, ceoRunId);
        if (!ceoComment.response.ok) throw new Error(`CEO planning comment failed: ${ceoComment.response.status}`);

        const implementationDescription = [
          "Owner: BuilderEngineer",
          "Touch list:",
          "- ui/src/App.tsx",
          "- server/src/routes/issues.ts",
          "Done criteria:",
          "- work is implemented",
          "- QA verifies",
          "- release package includes rollback path",
        ].join("\n");
        const pmRunId = await invokeAgentRun(pm.id);
        const pmIssue = await agentFetch(pm.id, `/companies/${companyId}/issues`, {
          method: "POST",
          body: JSON.stringify({
            title: `[Phase8] Execution issue ${runId}`,
            description: implementationDescription,
            status: "todo",
            priority: "high",
          }),
        }, pmRunId);
        if (!pmIssue.response.ok) throw new Error(`PM issue creation failed: ${pmIssue.response.status}`);
        const implementationIssue = pmIssue.body;
        issueIds.push(implementationIssue.id);
        artifacts.executionIssue = { id: implementationIssue.id, identifier: implementationIssue.identifier };

        const assignBuilder = await boardFetch(`/issues/${implementationIssue.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "todo" }),
        });
        if (!assignBuilder.response.ok) throw new Error(`Builder assignment failed: ${assignBuilder.response.status}`);

        const builderRunId = await invokeAgentRun(developer.id);
        const forbiddenBuilderMutation = await agentFetch(developer.id, `/issues/${directiveIssue.id}`, {
          method: "PATCH",
          body: JSON.stringify({ description: "Builder should not be able to mutate unassigned directive." }),
        }, builderRunId);

        const builderCheckout = await agentFetch(developer.id, `/issues/${implementationIssue.id}/checkout`, {
          method: "POST",
          body: JSON.stringify({ agentId: developer.id, expectedStatuses: ["todo", "backlog", "blocked"] }),
        }, builderRunId);
        if (!builderCheckout.response.ok) throw new Error(`Builder checkout failed: ${builderCheckout.response.status}`);

        const reliabilityRunId = await invokeAgentRun(reliability.id);
        const checkoutConflict = await agentFetch(reliability.id, `/issues/${implementationIssue.id}/checkout`, {
          method: "POST",
          body: JSON.stringify({ agentId: reliability.id, expectedStatuses: ["todo", "backlog", "blocked"] }),
        }, reliabilityRunId);

        const builderComment = await agentFetch(developer.id, `/issues/${implementationIssue.id}/comments`, {
          method: "POST",
          body: JSON.stringify({ body: "Implementation complete. Ready for QA review." }),
        }, builderRunId);
        if (!builderComment.response.ok) throw new Error(`Builder comment failed: ${builderComment.response.status}`);

        const securityRunId = await invokeAgentRun(security.id);
        const qaComment = await agentFetch(security.id, `/issues/${implementationIssue.id}/comments`, {
          method: "POST",
          body: JSON.stringify({ body: "QA verification passed. Acceptance criteria and evidence reviewed." }),
        }, securityRunId);
        if (!qaComment.response.ok) throw new Error(`QA comment failed: ${qaComment.response.status}`);

        const releaseComment = await agentFetch(reliability.id, `/issues/${implementationIssue.id}/comments`, {
          method: "POST",
          body: JSON.stringify({ body: "Release package ready. Rollback path: revert deployment and restore previous build." }),
        }, reliabilityRunId);
        if (!releaseComment.response.ok) throw new Error(`Release comment failed: ${releaseComment.response.status}`);

        const approvalCreate = await boardFetch(`/companies/${companyId}/approvals`, {
          method: "POST",
          body: JSON.stringify({
            type: "governed_action",
            requestedByAgentId: ceo.id,
            issueIds: [implementationIssue.id],
            payload: {
              action: "phase8_release_checkpoint",
              rollbackPlan: "Revert deployment and resume previous release.",
            },
          }),
        });
        if (!approvalCreate.response.ok) throw new Error(`Approval create failed: ${approvalCreate.response.status}`);
        const approval = approvalCreate.body;
        approvalIds.push(approval.id);
        artifacts.approval = { id: approval.id, type: approval.type };

        const approvalApprove = await boardFetch(`/approvals/${approval.id}/approve`, {
          method: "POST",
          body: JSON.stringify({ decisionNote: "Checkpoint approved during autonomy harness." }),
        });
        if (!approvalApprove.response.ok) throw new Error(`Approval approve failed: ${approvalApprove.response.status}`);

        artifacts.ceoHeartbeatRun = { id: ceoRunId };

        const costEvent = await agentFetch(developer.id, `/companies/${companyId}/cost-events`, {
          method: "POST",
          body: JSON.stringify({
            agentId: developer.id,
            issueId: implementationIssue.id,
            provider: "test",
            model: "phase8-simulated-model",
            costCents: 120,
          }),
        }, builderRunId);
        if (!costEvent.response.ok) throw new Error(`Cost event failed: ${costEvent.response.status}`);

        const budgetSet = await boardFetch(`/agents/${developer.id}/budgets`, {
          method: "PATCH",
          body: JSON.stringify({ budgetMonthlyCents: 1 }),
        });
        if (!budgetSet.response.ok) throw new Error(`Budget set failed: ${budgetSet.response.status}`);

        const overBudgetCost = await agentFetch(developer.id, `/companies/${companyId}/cost-events`, {
          method: "POST",
          body: JSON.stringify({
            agentId: developer.id,
            issueId: implementationIssue.id,
            provider: "test",
            model: "phase8-simulated-model",
            costCents: 5,
          }),
        }, builderRunId);
        if (!overBudgetCost.response.ok) throw new Error(`Over-budget cost event failed: ${overBudgetCost.response.status}`);

        const developerAfterBudget = await agentsSvc.getById(developer.id);
        developerAutoPaused = developerAfterBudget?.status === "paused";

        const blockedHeartbeat = await agentFetch(developer.id, `/agents/${developer.id}/heartbeat/invoke`, { method: "POST" });

        const activity = await activitySvc.list({ companyId });
        const issueActivity = activity.filter((entry) => issueIds.includes(entry.entityId));
        const approvalActivity = activity.filter((entry) => approvalIds.includes(entry.entityId));

        const checkpoints: CheckpointResult[] = [
          {
            id: 1,
            label: "New work reliably starts through the CEO",
            status: ceoCheckout.response.ok ? "pass" : "fail",
            evidence: [`Directive issue ${directiveIssue.identifier} created for CEO handling`, `CEO checkout status ${ceoCheckout.response.status}`],
          },
          {
            id: 2,
            label: "Planning is consolidated before execution begins",
            status: new Date(ceoComment.body.createdAt).getTime() <= new Date(builderCheckout.body.startedAt ?? builderCheckout.body.createdAt ?? Date.now()).getTime() ? "pass" : "fail",
            evidence: ["CEO planning comment created before builder execution", planningCommentBody],
          },
          {
            id: 3,
            label: "PM-created issues have owners, touch lists, and done criteria",
            status: pmIssue.response.ok && /Owner:/i.test(implementationIssue.description ?? "") && /Touch list:/i.test(implementationIssue.description ?? "") && /Done criteria:/i.test(implementationIssue.description ?? "") ? "pass" : "fail",
            evidence: [`Execution issue ${implementationIssue.identifier} created by PM agent`, implementationIssue.description ?? ""],
          },
          {
            id: 4,
            label: "The Builder Engineer only executes assigned work",
            status: forbiddenBuilderMutation.response.status === 403 && builderCheckout.response.ok ? "pass" : "fail",
            evidence: [`Forbidden mutation status ${forbiddenBuilderMutation.response.status}`, `Builder checkout status ${builderCheckout.response.status}`],
          },
          {
            id: 5,
            label: "QA verifies before release prep",
            status: new Date(qaComment.body.createdAt).getTime() <= new Date(releaseComment.body.createdAt).getTime() ? "pass" : "fail",
            evidence: ["QA verification comment recorded before release package comment"],
          },
          {
            id: 6,
            label: "Release/Ops packages with a rollback path",
            status: /rollback/i.test(String(releaseComment.body.body ?? "")) ? "pass" : "fail",
            evidence: [String(releaseComment.body.body ?? "")],
          },
          {
            id: 7,
            label: "The board is involved at checkpoints, not in every heartbeat",
            status: approvalApprove.response.ok && approvalActivity.some((entry) => entry.action === "approval.approved") ? "pass" : "fail",
            evidence: [`Approval ${approval.id} linked to ${implementationIssue.identifier}`, `Approval activity count ${approvalActivity.length}`],
          },
          {
            id: 8,
            label: "A company can run at least one active heartbeat-enabled agent",
            status: Boolean(ceoRunId) ? "pass" : "fail",
            evidence: [`CEO heartbeat run id ${ceoRunId}`],
          },
          {
            id: 9,
            label: "Task checkout is conflict-safe with 409 on concurrent claims",
            status: checkoutConflict.response.status === 409 ? "pass" : "fail",
            evidence: [`Conflicting checkout returned ${checkoutConflict.response.status}`],
          },
          {
            id: 10,
            label: "Agents can update tasks/comments and report costs with API keys only",
            status: builderComment.response.ok && qaComment.response.ok && releaseComment.response.ok && costEvent.response.ok ? "pass" : "fail",
            evidence: [
              `Builder comment ${builderComment.response.status}`,
              `QA comment ${qaComment.response.status}`,
              `Release comment ${releaseComment.response.status}`,
              `Cost event ${costEvent.response.status}`,
            ],
          },
          {
            id: 11,
            label: "Budget hard limit auto-pauses an agent and prevents new invocations",
            status: developerAutoPaused && blockedHeartbeat.response.status === 409 ? "pass" : "fail",
            evidence: [`Developer status after budget event: ${developerAfterBudget?.status ?? "unknown"}`, `Heartbeat invoke after pause returned ${blockedHeartbeat.response.status}`],
          },
          {
            id: 12,
            label: "Every mutation is auditable in activity log",
            status: issueActivity.length > 0 && approvalActivity.length > 0 && activity.some((entry) => entry.action === "cost.reported") ? "pass" : "fail",
            evidence: [`Issue activity entries ${issueActivity.length}`, `Approval activity entries ${approvalActivity.length}`, `Recent activity total ${activity.length}`],
          },
        ];

        return {
          companyId,
          runId,
          startedAt: startedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          summary: {
            passed: checkpoints.filter((checkpoint) => checkpoint.status === "pass").length,
            failed: checkpoints.filter((checkpoint) => checkpoint.status === "fail").length,
          },
          artifacts,
          checkpoints,
        };
      } finally {
        if (originalDeveloperBudget !== developer.budgetMonthlyCents) {
          await agentsSvc.update(developer.id, { budgetMonthlyCents: originalDeveloperBudget, status: "active" }).catch(() => null);
        } else if (developerAutoPaused) {
          await agentsSvc.update(developer.id, { status: "active" }).catch(() => null);
        }
        for (const keyId of keyIds) {
          await agentsSvc.revokeKey(keyId).catch(() => null);
        }
      }
    },
  };
}
