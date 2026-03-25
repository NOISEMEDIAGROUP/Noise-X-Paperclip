export type ObjectiveStatus = "proposed" | "approved" | "active" | "achieved" | "missed" | "cancelled";
export type ObjectiveType = "annual" | "quarterly" | "monthly" | "sprint";
export type KeyResultStatus = "pending" | "in_progress" | "done" | "missed" | "planned" | "active" | "cancelled";

export interface KeyResult {
  id: string;
  objectiveId: string;
  title: string;
  status: KeyResultStatus;
  targetValue: number;
  currentValue: number;
  assignedToId?: string | null; // ID of agent assigned to this KR
  createdAt: string;
  updatedAt: string;
}

export interface CompanyObjective {
  id: string;
  companyId: string;
  title: string;
  description: string | null;
  objectiveType: ObjectiveType;
  status: ObjectiveStatus;
  targetMetric: string | null; // Metric to measure objective success
  targetValue: number | null;
  currentValue: number;
  proposedById?: string | null; // ID of proposing agent
  approvedBy?: string | null; // ID of approver (board user)
  deadline: string | null;
  keyResults: KeyResult[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateObjectivePayload {
  title: string;
  description?: string | null;
  objectiveType?: ObjectiveType;
  status?: ObjectiveStatus;
  targetMetric?: string | null;
  targetValue?: number | null;
  currentValue?: number;
  proposedById?: string | null;
  approvedBy?: string | null;
  deadline?: string | null;
  keyResults?: CreateKeyResultPayload[];
}

export interface UpdateObjectivePayload extends Partial<CreateObjectivePayload> {}

export interface CreateKeyResultPayload {
  title: string;
  status?: KeyResultStatus;
  targetValue: number;
  currentValue?: number;
  assignedToId?: string | null;
}

export interface UpdateKeyResultPayload extends Partial<CreateKeyResultPayload> {}

export interface UpdateKeyResultPayload extends Partial<CreateKeyResultPayload> {}
