/** Sprint planner integration types. */

export interface SprintPlannerSprint {
  id: string;
  name: string;
  teamId: string;
  startDate: string;
  endDate: string;
  goal: string | null;
  status: "planning" | "active" | "completed" | "cancelled";
  velocity: number | null;
}

export interface SprintPlannerTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: "critical" | "high" | "medium" | "low";
  assigneeId: string | null;
  assigneeName: string | null;
  sprintId: string | null;
  epicId: string | null;
  estimatedPoints: number | null;
  actualPoints: number | null;
  teamId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SprintPlannerTicket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  assigneeId: string | null;
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SprintPlannerStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  blockedTasks: number;
  totalPoints: number;
  completedPoints: number;
  velocity: number | null;
}

export interface SprintPlannerKnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SprintPlannerActivityEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorName: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface SprintPlannerCapacity {
  teamId: string;
  sprintId: string;
  totalCapacity: number;
  allocatedCapacity: number;
  remainingCapacity: number;
  members: Array<{
    id: string;
    name: string;
    capacity: number;
    allocated: number;
  }>;
}

export interface SprintPlannerConfig {
  apiUrl: string;
  token: string;
  aiTeamId: string;
}
