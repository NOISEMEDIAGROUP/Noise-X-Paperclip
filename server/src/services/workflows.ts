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
        enabled?: string;
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
      if (workflow.enabled !== "true") {
        throw unprocessable("Workflow is disabled");
      }

      const steps = workflow.steps as WorkflowStepDefinition[];
      if (steps.length === 0) {
        throw unprocessable("Workflow has no steps");
      }

      const initialState = data.initialState ?? {};
      const run = await db
        .insert(workflowRuns)
        .values({
          companyId,
          workflowId: data.workflowId,
          issueId: data.issueId ?? null,
          currentStepIndex: 0,
          status: "running",
          state: initialState,
        })
        .returning()
        .then((rows) => rows[0]);

      const firstStep = steps[0];
      if (firstStep.requiresApproval) {
        await db
          .update(workflowRuns)
          .set({ status: "paused", updatedAt: new Date() })
          .where(eq(workflowRuns.id, run.id));

        await approvalsSvc.create(companyId, {
          type: "workflow_step",
          payload: {
            workflowRunId: run.id,
            workflowId: workflow.id,
            stepIndex: firstStep.stepIndex,
            stepName: firstStep.name,
          },
          status: "pending",
          decisionNote: null,
          decidedByUserId: null,
          decidedAt: null,
          updatedAt: new Date(),
        });

        return { ...run, status: "paused" };
      }

      await triggerStepAgent(companyId, firstStep, run);
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

      const nextIndex = run.currentStepIndex + 1;

      if (nextIndex >= steps.length) {
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
          .where(eq(workflowRuns.id, runId))
          .returning()
          .then((rows) => rows[0]);
        return completed;
      }

      const nextStep = steps[nextIndex];

      if (nextStep.conditions) {
        if (!evaluateConditions(nextStep.conditions, mergedState)) {
          const now = new Date();
          const failed = await db
            .update(workflowRuns)
            .set({
              currentStepIndex: nextIndex,
              status: "failed",
              state: mergedState,
              finishedAt: now,
              updatedAt: now,
            })
            .where(eq(workflowRuns.id, runId))
            .returning()
            .then((rows) => rows[0]);
          return failed;
        }
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
          .where(eq(workflowRuns.id, runId))
          .returning()
          .then((rows) => rows[0]);

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

        return paused;
      }

      const now = new Date();
      const advanced = await db
        .update(workflowRuns)
        .set({
          currentStepIndex: nextIndex,
          status: "running",
          state: mergedState,
          updatedAt: now,
        })
        .where(eq(workflowRuns.id, runId))
        .returning()
        .then((rows) => rows[0]);

      await triggerStepAgent(run.companyId, nextStep, advanced);
      return advanced;
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
