import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { workflows, workflowRuns } from "@paperclipai/db";
import type { WorkflowStepDefinition } from "@paperclipai/shared";
import { notFound, unprocessable } from "../errors.js";
import { heartbeatService } from "./heartbeat.js";
import { approvalService } from "./approvals.js";
import { logger } from "../middleware/logger.js";

export function workflowService(db: Db) {
  const heartbeat = heartbeatService(db);
  const approvalsSvc = approvalService(db);

  async function getWorkflowOrThrow(id: string) {
    const row = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id))
      .then((rows) => rows[0] ?? null);
    if (!row) throw notFound("Workflow not found");
    return row;
  }

  async function getRunOrThrow(id: string) {
    const row = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.id, id))
      .then((rows) => rows[0] ?? null);
    if (!row) throw notFound("Workflow run not found");
    return row;
  }

  function evaluateConditions(
    conditions: Record<string, unknown>,
    state: Record<string, unknown>,
  ): boolean {
    for (const [key, expected] of Object.entries(conditions)) {
      if (state[key] !== expected) return false;
    }
    return true;
  }

  async function triggerStepAgent(
    companyId: string,
    step: WorkflowStepDefinition,
    run: typeof workflowRuns.$inferSelect,
  ) {
    if (!step.agentId) return;
    try {
      await heartbeat.wakeup(step.agentId, {
        source: "automation",
        triggerDetail: "system",
        reason: "workflow_step",
        payload: {
          workflowRunId: run.id,
          workflowId: run.workflowId,
          stepIndex: step.stepIndex,
          stepName: step.name,
          state: run.state,
          issueId: run.issueId,
        },
        contextSnapshot: {
          source: "workflow.step_triggered",
          workflowRunId: run.id,
          workflowId: run.workflowId,
          stepIndex: step.stepIndex,
          stepName: step.name,
          issueId: run.issueId,
          wakeReason: "workflow_step",
        },
      });
    } catch (err) {
      logger.warn(
        { err, workflowRunId: run.id, stepIndex: step.stepIndex, agentId: step.agentId },
        "failed to wake agent for workflow step",
      );
    }
  }

  return {
    list: (companyId: string) =>
      db
        .select()
        .from(workflows)
        .where(eq(workflows.companyId, companyId))
        .orderBy(desc(workflows.createdAt)),

    getById: async (id: string) => {
      return getWorkflowOrThrow(id);
    },

    create: async (
      companyId: string,
      data: { name: string; description?: string | null; steps: WorkflowStepDefinition[] },
    ) => {
      return db
        .insert(workflows)
        .values({
          companyId,
          name: data.name,
          description: data.description ?? null,
          steps: data.steps,
        })
        .returning()
        .then((rows) => rows[0]);
    },

    update: async (
      id: string,
      data: {
        name?: string;
        description?: string | null;
        steps?: WorkflowStepDefinition[];
        enabled?: boolean;
      },
    ) => {
      await getWorkflowOrThrow(id);
      const now = new Date();
      return db
        .update(workflows)
        .set({
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.steps !== undefined ? { steps: data.steps } : {}),
          ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
          updatedAt: now,
        })
        .where(eq(workflows.id, id))
        .returning()
        .then((rows) => rows[0]);
    },

    delete: async (id: string) => {
      await getWorkflowOrThrow(id);
      await db.delete(workflowRuns).where(eq(workflowRuns.workflowId, id));
      await db.delete(workflows).where(eq(workflows.id, id));
    },

    startRun: async (
      companyId: string,
      data: { workflowId: string; issueId?: string; initialState?: Record<string, unknown> },
    ) => {
      const workflow = await getWorkflowOrThrow(data.workflowId);
      if (workflow.companyId !== companyId) {
        throw notFound("Workflow not found");
      }
      if (!workflow.enabled) {
        throw unprocessable("Workflow is disabled");
      }

      const steps = workflow.steps as WorkflowStepDefinition[];
      if (steps.length === 0) {
        throw unprocessable("Workflow has no steps");
      }

      const initialState = data.initialState ?? {};

      // Find first step whose conditions are satisfied (Issue #4)
      let selectedStep: WorkflowStepDefinition | null = null;
      let selectedIndex = -1;
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step.conditions && !evaluateConditions(step.conditions, initialState)) {
          continue;
        }
        selectedStep = step;
        selectedIndex = i;
        break;
      }

      if (!selectedStep) {
        // No step's conditions matched — insert as completed immediately
        const run = await db
          .insert(workflowRuns)
          .values({
            companyId,
            workflowId: data.workflowId,
            issueId: data.issueId ?? null,
            currentStepIndex: 0,
            status: "completed",
            state: initialState,
            finishedAt: new Date(),
          })
          .returning()
          .then((rows) => rows[0]);
        return run;
      }

      // Determine initial status before inserting (Issue #2)
      const initialStatus = selectedStep.requiresApproval ? "paused" : "running";

      const run = await db
        .insert(workflowRuns)
        .values({
          companyId,
          workflowId: data.workflowId,
          issueId: data.issueId ?? null,
          currentStepIndex: selectedIndex,
          status: initialStatus,
          state: initialState,
        })
        .returning()
        .then((rows) => rows[0]);

      if (selectedStep.requiresApproval) {
        await approvalsSvc.create(companyId, {
          type: "workflow_step",
          payload: {
            workflowRunId: run.id,
            workflowId: workflow.id,
            stepIndex: selectedStep.stepIndex,
            stepName: selectedStep.name,
          },
          status: "pending",
          decisionNote: null,
          decidedByUserId: null,
          decidedAt: null,
          updatedAt: new Date(),
        });

        return run;
      }

      await triggerStepAgent(companyId, selectedStep, run);
      return run;
    },

    advanceRun: async (
      runId: string,
      data: { resultState?: Record<string, unknown>; outcome?: string },
    ) => {
      const run = await getRunOrThrow(runId);
      if (run.status !== "running" && run.status !== "paused") {
        throw unprocessable(`Cannot advance a workflow run with status "${run.status}"`);
      }

      const workflow = await getWorkflowOrThrow(run.workflowId);
      const steps = workflow.steps as WorkflowStepDefinition[];

      const mergedState: Record<string, unknown> = {
        ...(run.state as Record<string, unknown>),
        ...(data.resultState ?? {}),
      };
      if (data.outcome) {
        mergedState._lastOutcome = data.outcome;
      }

      // Find next step whose conditions are satisfied (Issue #1)
      let nextStep: WorkflowStepDefinition | null = null;
      let nextIndex = -1;
      for (let i = run.currentStepIndex + 1; i < steps.length; i++) {
        const candidate = steps[i];
        if (candidate.conditions && !evaluateConditions(candidate.conditions, mergedState)) {
          continue;
        }
        nextStep = candidate;
        nextIndex = i;
        break;
      }

      if (!nextStep) {
        // No remaining step's conditions matched — mark as completed (not failed)
        const now = new Date();
        const completed = await db
          .update(workflowRuns)
          .set({
            currentStepIndex: run.currentStepIndex,
            status: "completed",
            state: mergedState,
            finishedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(workflowRuns.id, runId),
              eq(workflowRuns.currentStepIndex, run.currentStepIndex),
            ),
          )
          .returning();
        if (completed.length === 0)
          throw unprocessable("Run was already advanced by another caller");
        return completed[0];
      }

      if (nextStep.requiresApproval) {
        const now = new Date();
        const paused = await db
          .update(workflowRuns)
          .set({
            currentStepIndex: nextIndex,
            status: "paused",
            state: mergedState,
            updatedAt: now,
          })
          .where(
            and(
              eq(workflowRuns.id, runId),
              eq(workflowRuns.currentStepIndex, run.currentStepIndex),
            ),
          )
          .returning();
        if (paused.length === 0)
          throw unprocessable("Run was already advanced by another caller");

        await approvalsSvc.create(run.companyId, {
          type: "workflow_step",
          payload: {
            workflowRunId: run.id,
            workflowId: workflow.id,
            stepIndex: nextStep.stepIndex,
            stepName: nextStep.name,
          },
          status: "pending",
          decisionNote: null,
          decidedByUserId: null,
          decidedAt: null,
          updatedAt: new Date(),
        });

        return paused[0];
      }

      // Optimistic concurrency guard (Issue #3)
      const now = new Date();
      const result = await db
        .update(workflowRuns)
        .set({
          currentStepIndex: nextIndex,
          status: "running",
          state: mergedState,
          updatedAt: now,
        })
        .where(
          and(
            eq(workflowRuns.id, runId),
            eq(workflowRuns.currentStepIndex, run.currentStepIndex),
          ),
        )
        .returning();
      if (result.length === 0)
        throw unprocessable("Run was already advanced by another caller");

      await triggerStepAgent(run.companyId, nextStep, result[0]);
      return result[0];
    },

    getRun: async (runId: string) => {
      return getRunOrThrow(runId);
    },

    listRuns: (companyId: string, workflowId?: string) => {
      const conditions = [eq(workflowRuns.companyId, companyId)];
      if (workflowId) conditions.push(eq(workflowRuns.workflowId, workflowId));
      return db
        .select()
        .from(workflowRuns)
        .where(and(...conditions))
        .orderBy(desc(workflowRuns.createdAt));
    },
  };
}
