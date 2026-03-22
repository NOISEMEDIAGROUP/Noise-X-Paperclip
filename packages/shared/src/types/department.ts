import type { AgentRole } from "../constants.js";

// ============================================================================
// Department Status Types
// ============================================================================

export type DepartmentStatus = "ready" | "partial" | "missing";

export interface DepartmentStatusEntry {
  key: string;
  label: string;
  role: AgentRole;
  title: string;
  skillName: string;
  heartbeatIntervalSec: number;
  existingAgentId: string | null;
  existingAgentName: string | null;
  status: DepartmentStatus;
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

// ============================================================================
// Department Bootstrap Types
// ============================================================================

export interface DepartmentBootstrapResult {
  companyId: string;
  createdAgents: Array<{ id: string; name: string; departmentKey: string }>;
  updatedAgents: Array<{ id: string; name: string; departmentKey: string }>;
  createdSkills: string[];
  status: DepartmentStatusSummary;
}