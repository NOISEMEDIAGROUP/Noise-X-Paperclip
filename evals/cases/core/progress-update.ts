import type { EvalCase } from "../../types.js";

export const progressUpdate: EvalCase = {
  id: "core.progress_update",
  description: "Agent writes a progress comment on assigned issue",
  tags: ["core", "progress"],
  setup: {
    fixture: "companies/startup-seed.json",
    agentRole: "engineer",
    trigger: "timer",
  },
  input: {
    issueTitle: "Implement user authentication",
    issueBody: "Add JWT-based authentication to the API.",
    existingComments: ["I've picked up this task."],
  },
  checks: {
    hard: [
      { type: "contains", value: "progress" },
      { type: "regex", value: "completed|in progress|blocked" },
      { type: "json_path", value: "in_progress", path: "status" },
    ],
  },
};
