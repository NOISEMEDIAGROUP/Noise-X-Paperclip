import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, heartbeatRuns } from "@paperclipai/db";
import { logActivity } from "./activity-log.js";
import { logger } from "../middleware/logger.js";

export interface CircuitBreakerConfig {
  enabled: boolean;
  maxConsecutiveFailures: number;
  maxConsecutiveNoProgress: number;
  cooldownMinutes: number;
}

export const DEFAULT_CIRCUIT_BREAKER: CircuitBreakerConfig = {
  enabled: true,
  maxConsecutiveFailures: 3,
  maxConsecutiveNoProgress: 5,
  cooldownMinutes: 30,
};

export function resolveCircuitBreakerConfig(
  agentConfig: Record<string, unknown> | null | undefined,
): CircuitBreakerConfig {
  if (!agentConfig || typeof agentConfig !== "object") return DEFAULT_CIRCUIT_BREAKER;
  const raw = agentConfig as Record<string, unknown>;
  return {
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : DEFAULT_CIRCUIT_BREAKER.enabled,
    maxConsecutiveFailures:
      typeof raw.maxConsecutiveFailures === "number"
        ? raw.maxConsecutiveFailures
        : DEFAULT_CIRCUIT_BREAKER.maxConsecutiveFailures,
    maxConsecutiveNoProgress:
      typeof raw.maxConsecutiveNoProgress === "number"
        ? raw.maxConsecutiveNoProgress
        : DEFAULT_CIRCUIT_BREAKER.maxConsecutiveNoProgress,
    cooldownMinutes:
      typeof raw.cooldownMinutes === "number"
        ? raw.cooldownMinutes
        : DEFAULT_CIRCUIT_BREAKER.cooldownMinutes,
  };
}

export interface CircuitBreakerEvaluation {
  tripped: boolean;
  reason: string | null;
  consecutiveFailures: number;
  consecutiveNoProgress: number;
}

/**
 * Evaluate whether the circuit breaker should trip for the given agent.
 * Looks at the most recent runs in reverse chronological order.
 */
export async function evaluateCircuitBreaker(
  db: Db,
  agentId: string,
  config: CircuitBreakerConfig,
): Promise<CircuitBreakerEvaluation> {
  if (!config.enabled) {
    return { tripped: false, reason: null, consecutiveFailures: 0, consecutiveNoProgress: 0 };
  }

  const maxLookback = Math.max(config.maxConsecutiveFailures, config.maxConsecutiveNoProgress);
  const recentRuns = await db
    .select({
      id: heartbeatRuns.id,
      status: heartbeatRuns.status,
      exitCode: heartbeatRuns.exitCode,
      errorCode: heartbeatRuns.errorCode,
      resultJson: heartbeatRuns.resultJson,
      finishedAt: heartbeatRuns.finishedAt,
    })
    .from(heartbeatRuns)
    .where(
      and(
        eq(heartbeatRuns.agentId, agentId),
        eq(heartbeatRuns.status, "finished"),
      ),
    )
    .orderBy(desc(heartbeatRuns.finishedAt))
    .limit(maxLookback);

  let consecutiveFailures = 0;
  let consecutiveNoProgress = 0;

  for (const run of recentRuns) {
    const failed = run.exitCode !== 0 || run.errorCode !== null;
    const noProgress = !failed && isNoProgressRun(run.resultJson);

    if (failed) {
      consecutiveFailures++;
    } else {
      break; // streak broken for failures
    }
  }

  // Re-scan for no-progress (includes successful but idle runs)
  consecutiveNoProgress = 0;
  for (const run of recentRuns) {
    const failed = run.exitCode !== 0 || run.errorCode !== null;
    const noProgress = !failed && isNoProgressRun(run.resultJson);

    if (failed || noProgress) {
      consecutiveNoProgress++;
    } else {
      break;
    }
  }

  if (consecutiveFailures >= config.maxConsecutiveFailures) {
    return {
      tripped: true,
      reason: `${consecutiveFailures} consecutive failures`,
      consecutiveFailures,
      consecutiveNoProgress,
    };
  }

  if (consecutiveNoProgress >= config.maxConsecutiveNoProgress) {
    return {
      tripped: true,
      reason: `${consecutiveNoProgress} consecutive runs with no progress`,
      consecutiveFailures,
      consecutiveNoProgress,
    };
  }

  return { tripped: false, reason: null, consecutiveFailures, consecutiveNoProgress };
}

function isNoProgressRun(resultJson: Record<string, unknown> | null | undefined): boolean {
  if (!resultJson) return true;
  // A run with no mutations (no comments created, no status changes, no artifacts)
  // is considered "no progress"
  const mutations = resultJson.mutations ?? resultJson.issueMutations;
  if (Array.isArray(mutations) && mutations.length > 0) return false;
  const comments = resultJson.commentsCreated ?? resultJson.comments;
  if (Array.isArray(comments) && comments.length > 0) return false;
  // If the result has explicit "progress" or "output" markers, count as progress
  if (resultJson.hasProgress === true) return false;
  if (typeof resultJson.output === "string" && resultJson.output.length > 0) return false;
  return true;
}

/**
 * Trip the circuit breaker — pause the agent and log.
 */
export async function tripCircuitBreaker(
  db: Db,
  agentId: string,
  companyId: string,
  reason: string,
): Promise<void> {
  const now = new Date();
  await db
    .update(agents)
    .set({
      status: "paused",
      pauseReason: `circuit_breaker: ${reason}`,
      pausedAt: now,
      updatedAt: now,
    })
    .where(eq(agents.id, agentId));

  await logActivity(db, {
    companyId,
    actorType: "system",
    actorId: "circuit-breaker",
    action: "agent.circuit_breaker_tripped",
    entityType: "agent",
    entityId: agentId,
    details: { reason },
  });

  logger.warn({ agentId, reason }, "circuit breaker tripped — agent paused");
}
