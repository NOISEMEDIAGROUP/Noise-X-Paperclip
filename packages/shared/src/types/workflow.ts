export interface WorkflowStepDefinition {
  stepIndex: number;
  name: string;
  agentId: string | null;
  conditions?: Record<string, unknown>;
  requiresApproval?: boolean;
}

export interface Workflow {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  steps: WorkflowStepDefinition[];
  enabled: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowRun {
  id: string;
  companyId: string;
  workflowId: string;
  issueId: string | null;
  currentStepIndex: number;
  status: string;
  state: Record<string, unknown>;
  startedAt: Date;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
