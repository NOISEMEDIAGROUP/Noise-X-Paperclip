export type ObjectiveStatus = "proposed" | "approved" | "active" | "achieved" | "cancelled";
export type ObjectiveType = "quarterly" | "annual" | "initiative";
export type KeyResultStatus = "planned" | "active" | "achieved" | "cancelled";

export interface KeyResult {
  id: string;
  objectiveId: string;
  title: string;
  status: KeyResultStatus;
  targetValue: number;
  currentValue: number;
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
  targetValue: number | null;
  currentValue: number;
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
  targetValue?: number | null;
  currentValue: number;
  deadline?: string | null;
  keyResults?: CreateKeyResultPayload[];
}

export interface UpdateObjectivePayload extends Partial<CreateObjectivePayload> {}

export interface CreateKeyResultPayload {
  title: string;
  status?: KeyResultStatus;
  targetValue: number;
  currentValue?: number;
}

export interface UpdateKeyResultPayload extends Partial<CreateKeyResultPayload> {}
