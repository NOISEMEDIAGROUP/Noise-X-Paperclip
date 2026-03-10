const STATUS_LABELS: Record<string, string> = {
  backlog: "待规划",
  todo: "待办",
  in_progress: "进行中",
  in_review: "评审中",
  done: "已完成",
  cancelled: "已取消",
  blocked: "已阻塞",
  planned: "计划中",
  active: "活跃",
  achieved: "已达成",
  paused: "已暂停",
  running: "运行中",
  error: "异常",
  terminated: "已终止",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "紧急",
  high: "高",
  medium: "中",
  low: "低",
};

const LEVEL_LABELS: Record<string, string> = {
  company: "公司",
  team: "团队",
  agent: "智能体",
  task: "任务",
};

const UI_LABELS: Record<string, string> = {
  Dashboard: "仪表盘",
  Inbox: "收件箱",
  Issues: "任务",
  Goals: "目标",
  Projects: "项目",
  Agents: "智能体",
  Costs: "成本",
  Activity: "活动",
  Settings: "设置",
  Company: "公司",
  Org: "组织",
  Approvals: "审批",
  "Approval Detail": "审批详情",
  "Issue Detail": "任务详情",
  "Project Detail": "项目详情",
  "Agent Detail": "智能体详情",
  "Goal Detail": "目标详情",
  "Company Settings": "公司设置",
  "Design Guide": "设计指南",
  "New Agent": "新建智能体",
};

export function fallbackLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? fallbackLabel(status);
}

export function priorityLabel(priority: string): string {
  return PRIORITY_LABELS[priority] ?? fallbackLabel(priority);
}

export function goalLevelLabel(level: string): string {
  return LEVEL_LABELS[level] ?? fallbackLabel(level);
}

export function uiLabel(label: string): string {
  return UI_LABELS[label] ?? label;
}

