import type { EvalCase } from "../../types.js";

export const assignmentPickup: EvalCase = {
  id: "core.assignment_pickup",
  description: "Agent acknowledges assignment and starts work",
  tags: ["core", "assignment"],
  setup: {
    fixture: "companies/startup-seed.json",
    agentRole: "engineer",
    trigger: "assignment",
  },
  input: {
    issueTitle: "Implement user authentication",
    issueBody: "Add JWT-based authentication to the API.",
  },
  checks: {
    hard: [
      { type: "contains", value: "acknowledge" },
      { type: "contains", value: "eval-issue-001" },
      { type: "json_path", value: "in_progress", path: "status" },
    ],
  },
};
