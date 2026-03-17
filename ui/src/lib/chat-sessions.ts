import type { ChatSession } from "@paperclipai/shared";

export type ChatSessionGroupKey = "open" | "previous7Days" | "older" | "archived";

export interface GroupedChatSessions {
  open: ChatSession[];
  previous7Days: ChatSession[];
  older: ChatSession[];
  archived: ChatSession[];
}

function parseSessionDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function displaySessionTitle(session: Pick<ChatSession, "title">): string {
  return session.title?.trim() || "Untitled";
}

export function filterChatSessions(sessions: ChatSession[], query: string): ChatSession[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return sessions;
  return sessions.filter((session) => displaySessionTitle(session).toLowerCase().includes(normalized));
}

export function groupChatSessions(
  sessions: ChatSession[],
  options?: {
    now?: Date;
    activeSessionId?: string | null;
  },
): GroupedChatSessions {
  const now = options?.now ?? new Date();
  const cutoffMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const activeSessionId = options?.activeSessionId ?? null;
  const grouped: GroupedChatSessions = {
    open: [],
    previous7Days: [],
    older: [],
    archived: [],
  };

  for (const session of sessions) {
    if (session.archivedAt) {
      grouped.archived.push(session);
      continue;
    }
    if (activeSessionId && session.id === activeSessionId) {
      grouped.open.push(session);
      continue;
    }
    const activityDate = parseSessionDate(session.lastMessageAt) ?? parseSessionDate(session.updatedAt);
    if (activityDate && activityDate.getTime() >= cutoffMs) {
      grouped.previous7Days.push(session);
    } else {
      grouped.older.push(session);
    }
  }

  return grouped;
}
