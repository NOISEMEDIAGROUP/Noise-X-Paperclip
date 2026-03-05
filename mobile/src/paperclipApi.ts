import type { PaperclipMobileConfig } from "./config";

type IssueStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done" | "blocked" | "cancelled";
type IssuePriority = "critical" | "high" | "medium" | "low";

interface PaperclipIssueResponse {
  id: string;
  identifier?: string | null;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  updatedAt: string;
}

export interface IssueSummary {
  id: string;
  identifier: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  updatedAt: string;
}

interface FetchIssueParams {
  apiKey: string;
  config: PaperclipMobileConfig;
}

const STATUS_FILTER = "todo,in_progress,blocked";
const PRIORITY_WEIGHT: Record<IssuePriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

async function readErrorText(response: Response): Promise<string> {
  try {
    const body = await response.text();
    return body ? body.slice(0, 240) : "";
  } catch {
    return "";
  }
}

function toIssueSummary(issue: PaperclipIssueResponse): IssueSummary {
  return {
    id: issue.id,
    identifier: issue.identifier ?? issue.id.slice(0, 8),
    title: issue.title,
    status: issue.status,
    priority: issue.priority,
    updatedAt: issue.updatedAt,
  };
}

export async function fetchInboxIssues({
  apiKey,
  config,
}: FetchIssueParams): Promise<IssueSummary[]> {
  if (config.missing.length > 0) {
    throw new Error(`Missing app config: ${config.missing.join(", ")}`);
  }

  const query = new URLSearchParams({
    assigneeAgentId: config.agentId,
    status: STATUS_FILTER,
  });
  const endpoint = `${config.apiUrl}/api/companies/${encodeURIComponent(
    config.companyId,
  )}/issues?${query.toString()}`;

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const details = await readErrorText(response);
    throw new Error(
      `Paperclip API request failed (${response.status} ${response.statusText})${details ? `: ${details}` : ""}`,
    );
  }

  const data = (await response.json()) as PaperclipIssueResponse[];
  if (!Array.isArray(data)) {
    throw new Error("Unexpected API payload: expected issue array.");
  }

  return data
    .map(toIssueSummary)
    .sort(
      (a, b) =>
        PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] ||
        b.updatedAt.localeCompare(a.updatedAt),
    );
}
