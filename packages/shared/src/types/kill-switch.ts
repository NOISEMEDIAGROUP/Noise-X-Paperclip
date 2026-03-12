export interface KillSwitchProcessInfo {
  runId: string;
  agentId: string;
  agentName: string;
  status: string;
  pid: number | null;
  startedAt: string | null;
  issueId: string | null;
}

export interface KillSwitchStatus {
  processes: KillSwitchProcessInfo[];
  totalRunning: number;
}

export interface KillAllResult {
  killedCount: number;
}
