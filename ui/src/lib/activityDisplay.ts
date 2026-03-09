import type { ActivityEvent, Agent, Goal, Issue, Project } from "@paperclipai/shared";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getAgentDisplayFromDetails(details: Record<string, unknown> | null) {
  return {
    name: readString(details?.name) ?? readString(details?.agentName),
    title: readString(details?.title) ?? readString(details?.role),
  };
}

export function buildActivityDisplayMaps(input: {
  events?: ActivityEvent[];
  agents?: Agent[];
  issues?: Issue[];
  projects?: Project[];
  goals?: Goal[];
}) {
  const agentMap = new Map<string, Agent>();
  const agentNameMap = new Map<string, string>();
  const entityNameMap = new Map<string, string>();
  const entityTitleMap = new Map<string, string>();

  for (const issue of input.issues ?? []) {
    entityNameMap.set(`issue:${issue.id}`, issue.identifier ?? issue.id.slice(0, 8));
    entityTitleMap.set(`issue:${issue.id}`, issue.title);
  }

  for (const project of input.projects ?? []) {
    entityNameMap.set(`project:${project.id}`, project.name);
  }

  for (const goal of input.goals ?? []) {
    entityNameMap.set(`goal:${goal.id}`, goal.title);
  }

  for (const agent of input.agents ?? []) {
    agentMap.set(agent.id, agent);
    agentNameMap.set(agent.id, agent.name);
    entityNameMap.set(`agent:${agent.id}`, agent.name);
  }

  const historyAgentInfo = new Map<string, { name: string | null; title: string | null }>();
  for (const event of input.events ?? []) {
    if (event.entityType !== "agent") continue;
    const current = historyAgentInfo.get(event.entityId) ?? { name: null, title: null };
    const details = getAgentDisplayFromDetails(asRecord(event.details));
    historyAgentInfo.set(event.entityId, {
      name: current.name ?? details.name,
      title: current.title ?? details.title,
    });
  }

  for (const [agentId, info] of historyAgentInfo) {
    if (info.name && !agentNameMap.has(agentId)) {
      agentNameMap.set(agentId, info.name);
    }
    if (info.name && !entityNameMap.has(`agent:${agentId}`)) {
      entityNameMap.set(`agent:${agentId}`, info.name);
    }
    if (info.title && !agentMap.has(agentId)) {
      entityTitleMap.set(`agent:${agentId}`, info.title);
    }
  }

  return {
    agentMap,
    agentNameMap,
    entityNameMap,
    entityTitleMap,
  };
}

export function getActivityEventAgentDisplay(event: ActivityEvent) {
  return getAgentDisplayFromDetails(asRecord(event.details));
}
