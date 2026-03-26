import type { EvalCase } from "../../types.js";

export const blockedReporting: EvalCase = {
  id: "core.blocked_reporting",
  description: "Agent reports a blocker clearly",
  tags: ["core", "blocked"],
  setup: {
    fixture: "companies/startup-seed.json",
    agentRole: "engineer",
    trigger: "timer",
  },
  input: {
    issueTitle: "Integrate payment gateway",
    issueBody: "Connect Stripe for payment processing.",
  },
  checks: {
    hard: [
      { type: "contains", value: "blocked" },
      { type: "regex", value: "credential|key|access|permission" },
      { type: "json_path", value: "blocked", path: "status" },
    ],
  },
};
