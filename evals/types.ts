export interface HardCheck {
  type: "contains" | "regex" | "json_path";
  value: string;
  path?: string;
  /** If true, the check asserts the value is NOT present */
  negate?: boolean;
}

export interface EvalCase {
  id: string;
  description: string;
  tags: string[];
  setup: {
    fixture: string;
    agentRole?: string;
    trigger: "assignment" | "timer" | "on_demand" | "comment" | "approval";
  };
  /** Simulated input to the agent */
  input: {
    issueTitle: string;
    issueBody: string;
    existingComments?: string[];
  };
  checks: {
    hard: HardCheck[];
  };
}

export interface EvalBundle {
  id: string;
  adapter: string;
  model: string;
  skills: string[];
}

export interface EvalTrace {
  caseId: string;
  bundleId: string;
  passed: boolean;
  failedChecks: string[];
  durationMs: number;
  output: string;
}

export interface EvalResult {
  bundle: EvalBundle;
  traces: EvalTrace[];
  totalPassed: number;
  totalFailed: number;
}
