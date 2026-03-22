export interface DepartmentStatusEntry {
  key: string;
  label: string;
  role: string;
  title: string;
  skillName: string;
  heartbeatIntervalSec: number;
  existingAgentId: string | null;
  existingAgentName: string | null;
  status: "ready" | "partial" | "missing";
  reasons: string[];
}

export interface DepartmentStatusSummary {
  companyId: string;
  companyName: string;
  readyCount: number;
  partialCount: number;
  missingCount: number;
  entries: DepartmentStatusEntry[];
}

export interface DepartmentBootstrapResult {
  companyId: string;
  createdAgents: Array<{ id: string; name: string; departmentKey: string }>;
  updatedAgents: Array<{ id: string; name: string; departmentKey: string }>;
  createdSkills: string[];
  status: DepartmentStatusSummary;
}
