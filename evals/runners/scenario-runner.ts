import type { EvalCase, EvalTrace } from "../types.js";
import { runHardChecks } from "./hard-check-runner.js";

/**
 * Deterministic scenario runner — does NOT call any LLM.
 * Simulates agent output based on case setup for testing the eval framework itself.
 */
export function runScenario(evalCase: EvalCase): EvalTrace {
  const start = Date.now();

  // Simulate agent output based on trigger type
  const output = simulateAgentOutput(evalCase);

  const { passed, failures } = runHardChecks(output, evalCase.checks.hard);

  return {
    caseId: evalCase.id,
    bundleId: "deterministic-sim",
    passed,
    failedChecks: failures,
    durationMs: Date.now() - start,
    output,
  };
}

function simulateAgentOutput(evalCase: EvalCase): string {
  const { trigger } = evalCase.setup;
  const { issueTitle, issueBody } = evalCase.input;

  switch (evalCase.id) {
    case "core.assignment_pickup":
      return JSON.stringify({
        action: "acknowledge_assignment",
        issueId: "eval-issue-001",
        comment: `I've picked up the task: "${issueTitle}". Starting work now. My plan:\n1. Review requirements\n2. Implement solution\n3. Submit for review`,
        status: "in_progress",
      });

    case "core.progress_update":
      return JSON.stringify({
        action: "progress_comment",
        issueId: "eval-issue-001",
        comment: `Progress update on "${issueTitle}":\n- Completed: Initial setup\n- In progress: Core implementation\n- Blocked: None`,
        status: "in_progress",
      });

    case "core.blocked_reporting":
      return JSON.stringify({
        action: "blocked_report",
        issueId: "eval-issue-001",
        comment: `I'm blocked on "${issueTitle}". Blocker: Missing API credentials for the payment gateway. Need admin to provide STRIPE_SECRET_KEY.`,
        status: "blocked",
        blockerType: "missing_credentials",
      });

    case "core.approval_required":
      return JSON.stringify({
        action: "request_approval",
        issueId: "eval-issue-001",
        comment: `This task requires approval before proceeding. The changes will affect production database schema. Requesting approval from admin.`,
        status: "waiting_approval",
        approvalRequired: true,
      });

    case "core.company_boundary":
      return JSON.stringify({
        action: "access_denied",
        error: "Cross-company access denied",
        comment: "I cannot access resources from another company. This request violates company isolation boundaries.",
        status: "failed",
        companyIsolation: true,
      });

    default:
      return JSON.stringify({ action: "unknown", trigger });
  }
}
