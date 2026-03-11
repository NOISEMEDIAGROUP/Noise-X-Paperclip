import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type JsonRecord = { [key: string]: JsonValue };

export type RecoveryContext = {
  companyId?: string;
  agentId?: string;
  runId?: string;
  filePath?: string;
};

export type RecoveryCompany = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  issuePrefix: string;
  issueCounter: number;
  budgetMonthlyCents: number;
  spentMonthlyCents: number;
  requireBoardApprovalForNewAgents: boolean;
  brandColor: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecoveryAgent = {
  id: string;
  companyId: string;
  name: string;
  role: string;
  title?: string | null;
  icon?: string | null;
  status?: string | null;
  reportsTo?: string | null;
  capabilities?: string | null;
  adapterType?: string | null;
  adapterConfig?: JsonRecord | null;
  runtimeConfig?: JsonRecord | null;
  budgetMonthlyCents?: number | null;
  spentMonthlyCents?: number | null;
  permissions?: JsonRecord | null;
  metadata?: JsonRecord | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  urlKey?: string | null;
  lastHeartbeatAt?: string | null;
};

export type RecoveryGoal = {
  id: string;
  companyId: string;
  title: string;
  description?: string | null;
  level?: string | null;
  status?: string | null;
  parentId?: string | null;
  ownerAgentId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type RecoveryProject = {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  status?: string | null;
  goalId?: string | null;
  leadAgentId?: string | null;
  targetDate?: string | null;
  color?: string | null;
  executionWorkspacePolicy?: JsonRecord | null;
  archivedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type RecoveryIssue = {
  id: string;
  companyId: string;
  projectId?: string | null;
  goalId?: string | null;
  parentId?: string | null;
  title: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  assigneeAgentId?: string | null;
  assigneeUserId?: string | null;
  checkoutRunId?: string | null;
  executionRunId?: string | null;
  executionAgentNameKey?: string | null;
  executionLockedAt?: string | null;
  createdByAgentId?: string | null;
  createdByUserId?: string | null;
  issueNumber?: number | null;
  identifier?: string | null;
  requestDepth?: number | null;
  billingCode?: string | null;
  assigneeAdapterOverrides?: JsonRecord | null;
  executionWorkspaceSettings?: JsonRecord | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  hiddenAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type RecoveryIssueComment = {
  id: string;
  companyId: string;
  issueId: string;
  authorAgentId?: string | null;
  authorUserId?: string | null;
  body: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type RecoveryApproval = {
  id: string;
  companyId: string;
  type: string;
  requestedByAgentId?: string | null;
  requestedByUserId?: string | null;
  status?: string | null;
  payload: JsonRecord;
  decisionNote?: string | null;
  decidedByUserId?: string | null;
  decidedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type RecoveryIssueApproval = {
  companyId: string;
  issueId: string;
  approvalId: string;
  linkedByAgentId?: string | null;
  linkedByUserId?: string | null;
  createdAt: string;
};

export type RecoveryHeartbeatRun = {
  id: string;
  companyId: string;
  agentId: string;
  invocationSource: string;
  triggerDetail: string | null;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  wakeupRequestId: string | null;
  exitCode: number | null;
  signal: string | null;
  usageJson: JsonRecord | null;
  resultJson: JsonRecord | null;
  sessionIdBefore: string | null;
  sessionIdAfter: string | null;
  logStore: string | null;
  logRef: string | null;
  logBytes: number | null;
  logSha256: string | null;
  logCompressed: boolean;
  stdoutExcerpt: string | null;
  stderrExcerpt: string | null;
  errorCode: string | null;
  externalRunId: string | null;
  contextSnapshot: JsonRecord | null;
  createdAt: string;
  updatedAt: string;
};

export type RecoverySnapshot = {
  company: RecoveryCompany | null;
  agents: RecoveryAgent[];
  goals: RecoveryGoal[];
  projects: RecoveryProject[];
  issues: RecoveryIssue[];
  issueComments: RecoveryIssueComment[];
  approvals: RecoveryApproval[];
  issueApprovals: RecoveryIssueApproval[];
  heartbeatRuns: RecoveryHeartbeatRun[];
};

type RunEventEnvelope = {
  ts?: string;
  stream?: string;
  chunk?: string;
};

type CommandExecutionItem = {
  id?: string;
  type?: string;
  command?: string;
  aggregated_output?: string;
  exit_code?: number | null;
  status?: string;
};

type TurnCompletedEvent = {
  type?: string;
  usage?: JsonRecord;
};

type MutableState = {
  company: RecoveryCompany | null;
  agents: Map<string, RecoveryAgent>;
  goals: Map<string, RecoveryGoal>;
  projects: Map<string, RecoveryProject>;
  issues: Map<string, RecoveryIssue>;
  issueComments: Map<string, RecoveryIssueComment>;
  approvals: Map<string, RecoveryApproval>;
  issueApprovals: Map<string, RecoveryIssueApproval>;
  heartbeatRuns: Map<string, RecoveryHeartbeatRun>;
};

type RunMeta = {
  firstTs: string | null;
  lastTs: string | null;
  sawTurnCompleted: boolean;
  usageJson: JsonRecord | null;
  issueIds: Set<string>;
};

const companyIssuesRe = /\/api\/companies\/[^/\\\s"'?]+\/issues(?:[\\?"' ]|$)/;
const issueRe = /\/api\/issues\/([^/\\\s"'?]+)(?:[\\?"' ]|$)/;
const issueCommentsRe = /\/api\/issues\/([^/\\\s"'?]+)\/comments(?:\/[^/\\\s"'?]+)?(?:[\\?"' ]|$)/;
const issueApprovalsRe = /\/api\/issues\/([^/\\\s"'?]+)\/approvals(?:[\\?"' ]|$)/;
const approvalIssuesRe = /\/api\/approvals\/([^/\\\s"'?]+)\/issues(?:[\\?"' ]|$)/;
const goalsRe = /\/api\/goals\/([^/\\\s"'?]+)(?:[\\?"' ]|$)/;

export async function extractRecoverySnapshotFromFile(
  filePath: string,
  partialContext: Partial<RecoveryContext> = {},
): Promise<RecoverySnapshot> {
  const text = await readFile(filePath, "utf8");
  return extractRecoverySnapshotFromNdjson(text, {
    ...deriveRecoveryContextFromPath(filePath),
    ...partialContext,
    filePath,
  });
}

export async function listRecoveryLogFiles(logRoot: string): Promise<string[]> {
  const files: string[] = [];
  const queue = [path.resolve(logRoot)];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(entryPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".ndjson")) {
        files.push(entryPath);
      }
    }
  }

  files.sort((left, right) => left.localeCompare(right));
  return files;
}

export async function extractRecoverySnapshotFromLogRoot(
  logRoot: string,
  partialContext: Partial<RecoveryContext> = {},
): Promise<RecoverySnapshot> {
  const files = await listRecoveryLogFiles(logRoot);
  const snapshots: RecoverySnapshot[] = [];
  for (const filePath of files) {
    snapshots.push(await extractRecoverySnapshotFromFile(filePath, partialContext));
  }
  return mergeRecoverySnapshots(snapshots);
}

export function deriveRecoveryContextFromPath(filePath: string): RecoveryContext {
  const normalized = path.normalize(filePath);
  const parts = normalized.split(path.sep);
  const runFileName = parts.at(-1);
  const agentId = parts.at(-2);
  const companyId = parts.at(-3);
  const runId = runFileName?.endsWith(".ndjson") ? runFileName.slice(0, -".ndjson".length) : undefined;
  return { companyId, agentId, runId, filePath };
}

export function extractRecoverySnapshotFromNdjson(
  ndjson: string,
  context: RecoveryContext,
): RecoverySnapshot {
  const state = createMutableState();
  const runMeta: RunMeta = {
    firstTs: null,
    lastTs: null,
    sawTurnCompleted: false,
    usageJson: null,
    issueIds: new Set<string>(),
  };

  for (const line of ndjson.split("\n")) {
    if (!line.trim()) continue;
    const row = safeJsonParse(line);
    if (!isRecord(row)) continue;

    const ts = typeof row.ts === "string" ? row.ts : null;
    if (ts) {
      if (!runMeta.firstTs || ts < runMeta.firstTs) runMeta.firstTs = ts;
      if (!runMeta.lastTs || ts > runMeta.lastTs) runMeta.lastTs = ts;
    }

    const chunk = typeof row.chunk === "string" ? row.chunk.trim() : "";
    if (!chunk) continue;
    const event = safeJsonParse(chunk);
    if (!isRecord(event)) continue;

    if (event.type === "turn.completed") {
      runMeta.sawTurnCompleted = true;
      if (isRecord(event.usage)) runMeta.usageJson = event.usage;
      continue;
    }

    if (event.type !== "item.completed") continue;
    const item = isRecord(event.item) ? event.item : null;
    if (!item || item.type !== "command_execution") continue;

    const command = typeof item.command === "string" ? item.command : "";
    const aggregatedOutput = typeof item.aggregated_output === "string" ? item.aggregated_output : "";
    if (!command && !aggregatedOutput) continue;

    const extracted = extractEntitiesFromCommandOutput(command, aggregatedOutput, ts, context);
    mergeMutableState(state, extracted);

    for (const issue of extracted.issues.values()) runMeta.issueIds.add(issue.id);
    for (const link of extracted.issueApprovals.values()) runMeta.issueIds.add(link.issueId);

    const directIssueId = extractIssueIdFromCommand(command);
    if (directIssueId) runMeta.issueIds.add(directIssueId);
  }

  const company = buildDefaultCompany(state, context, runMeta);
  if (company) state.company = mergePartialRecord(state.company, company);

  const heartbeatRun = buildHeartbeatRun(context, runMeta);
  if (heartbeatRun) state.heartbeatRuns.set(heartbeatRun.id, heartbeatRun);

  refreshDerivedCompany(state);

  return finalizeMutableState(state);
}

export function mergeRecoverySnapshots(snapshots: RecoverySnapshot[]): RecoverySnapshot {
  const state = createMutableState();
  for (const snapshot of snapshots) {
    if (snapshot.company) state.company = mergePartialRecord(state.company, snapshot.company);
    mergeByIdMap(state.agents, snapshot.agents);
    mergeByIdMap(state.goals, snapshot.goals);
    mergeByIdMap(state.projects, snapshot.projects);
    mergeByIdMap(state.issues, snapshot.issues);
    mergeByIdMap(state.issueComments, snapshot.issueComments);
    mergeByIdMap(state.approvals, snapshot.approvals);
    for (const link of snapshot.issueApprovals) {
      const key = issueApprovalKey(link.issueId, link.approvalId);
      state.issueApprovals.set(key, mergePartialRecord(state.issueApprovals.get(key), link));
    }
    mergeByIdMap(state.heartbeatRuns, snapshot.heartbeatRuns);
  }
  refreshDerivedCompany(state);
  return finalizeMutableState(state);
}

function createMutableState(): MutableState {
  return {
    company: null,
    agents: new Map<string, RecoveryAgent>(),
    goals: new Map<string, RecoveryGoal>(),
    projects: new Map<string, RecoveryProject>(),
    issues: new Map<string, RecoveryIssue>(),
    issueComments: new Map<string, RecoveryIssueComment>(),
    approvals: new Map<string, RecoveryApproval>(),
    issueApprovals: new Map<string, RecoveryIssueApproval>(),
    heartbeatRuns: new Map<string, RecoveryHeartbeatRun>(),
  };
}

function extractEntitiesFromCommandOutput(
  command: string,
  aggregatedOutput: string,
  ts: string | null,
  context: RecoveryContext,
): MutableState {
  const state = createMutableState();
  const values = extractJsonValues(aggregatedOutput);

  for (const value of values) {
    visitValue(value, command, context, state);
  }

  const issueIdForApprovalList = extractIssueApprovalsIssueId(command);
  if (issueIdForApprovalList) {
    const approvalIds = [...state.approvals.keys()].sort((left, right) => left.localeCompare(right));
    for (const approvalId of approvalIds) {
      const key = issueApprovalKey(issueIdForApprovalList, approvalId);
      state.issueApprovals.set(key, {
        companyId: context.companyId ?? inferCompanyId(state) ?? "unknown-company",
        issueId: issueIdForApprovalList,
        approvalId,
        linkedByAgentId: context.agentId ?? null,
        linkedByUserId: null,
        createdAt: ts ?? new Date(0).toISOString(),
      });
    }
  }

  const approvalIdForIssueList = command.match(approvalIssuesRe)?.[1] ?? null;
  if (approvalIdForIssueList) {
    const issueIds = [...state.issues.keys()].sort((left, right) => left.localeCompare(right));
    for (const issueId of issueIds) {
      const key = issueApprovalKey(issueId, approvalIdForIssueList);
      state.issueApprovals.set(key, {
        companyId: context.companyId ?? inferCompanyId(state) ?? "unknown-company",
        issueId,
        approvalId: approvalIdForIssueList,
        linkedByAgentId: context.agentId ?? null,
        linkedByUserId: null,
        createdAt: ts ?? new Date(0).toISOString(),
      });
    }
  }

  const patchComment = extractIssueCommentFromPatchCommand(command, values, ts, context);
  if (patchComment) {
    state.issueComments.set(
      patchComment.id,
      mergePartialRecord(state.issueComments.get(patchComment.id), patchComment),
    );
  }

  return state;
}

function visitValue(
  value: JsonValue,
  command: string,
  context: RecoveryContext,
  state: MutableState,
): void {
  if (Array.isArray(value)) {
    for (const item of value) visitValue(item, command, context, state);
    return;
  }

  if (!isRecord(value)) return;

  if (isRecord(value.agent)) visitValue(value.agent, command, context, state);
  if (isRecord(value.approval)) visitValue(value.approval, command, context, state);
  if (isRecord(value.goal) && goalsRe.test(command)) visitValue(value.goal, command, context, state);
  if (isRecord(value.project)) visitValue(value.project, command, context, state);

  if (isAgentCandidate(value)) {
    const agent = normalizeAgent(value, context.companyId);
    state.agents.set(agent.id, mergePartialRecord(state.agents.get(agent.id), agent));
    return;
  }

  if (isIssueCommentCandidate(value)) {
    const comment = normalizeIssueComment(value, context.companyId);
    state.issueComments.set(comment.id, mergePartialRecord(state.issueComments.get(comment.id), comment));
    return;
  }

  if (isApprovalCandidate(value)) {
    const approval = normalizeApproval(value, context.companyId);
    state.approvals.set(approval.id, mergePartialRecord(state.approvals.get(approval.id), approval));
    return;
  }

  if (goalsRe.test(command) && isGoalCandidate(value)) {
    const goal = normalizeGoal(value, context.companyId);
    state.goals.set(goal.id, mergePartialRecord(state.goals.get(goal.id), goal));
    return;
  }

  if (isProjectCandidate(value)) {
    const project = normalizeProject(value, context.companyId);
    state.projects.set(project.id, mergePartialRecord(state.projects.get(project.id), project));
    return;
  }

  if (isIssueCandidate(value)) {
    const issue = normalizeIssue(value, context.companyId);
    state.issues.set(issue.id, mergePartialRecord(state.issues.get(issue.id), issue));
    return;
  }
}

function normalizeAgent(value: JsonRecord, companyIdFallback?: string): RecoveryAgent {
  return {
    id: readString(value.id) ?? "unknown-agent",
    companyId: readString(value.companyId) ?? companyIdFallback ?? "unknown-company",
    name: readString(value.name) ?? "Unknown Agent",
    role: readString(value.role) ?? "general",
    title: readNullableString(value.title),
    icon: readNullableString(value.icon),
    status: readNullableString(value.status),
    reportsTo: readNullableString(value.reportsTo),
    capabilities: readNullableString(value.capabilities),
    adapterType: readNullableString(value.adapterType),
    adapterConfig: readNullableRecord(value.adapterConfig),
    runtimeConfig: readNullableRecord(value.runtimeConfig),
    budgetMonthlyCents: readNullableNumber(value.budgetMonthlyCents),
    spentMonthlyCents: readNullableNumber(value.spentMonthlyCents),
    permissions: readNullableRecord(value.permissions),
    metadata: readNullableRecord(value.metadata),
    createdAt: readNullableString(value.createdAt),
    updatedAt: readNullableString(value.updatedAt),
    urlKey: readNullableString(value.urlKey),
    lastHeartbeatAt: readNullableString(value.lastHeartbeatAt),
  };
}

function normalizeGoal(value: JsonRecord, companyIdFallback?: string): RecoveryGoal {
  return {
    id: readString(value.id) ?? "unknown-goal",
    companyId: readString(value.companyId) ?? companyIdFallback ?? "unknown-company",
    title: readString(value.title) ?? "Untitled Goal",
    description: readNullableString(value.description),
    level: readNullableString(value.level),
    status: readNullableString(value.status),
    parentId: readNullableString(value.parentId),
    ownerAgentId: readNullableString(value.ownerAgentId),
    createdAt: readNullableString(value.createdAt),
    updatedAt: readNullableString(value.updatedAt),
  };
}

function normalizeProject(value: JsonRecord, companyIdFallback?: string): RecoveryProject {
  return {
    id: readString(value.id) ?? "unknown-project",
    companyId: readString(value.companyId) ?? companyIdFallback ?? "unknown-company",
    name: readString(value.name) ?? "Untitled Project",
    description: readNullableString(value.description),
    status: readNullableString(value.status),
    goalId: readNullableString(value.goalId),
    leadAgentId: readNullableString(value.leadAgentId),
    targetDate: readNullableString(value.targetDate),
    color: readNullableString(value.color),
    executionWorkspacePolicy: readNullableRecord(value.executionWorkspacePolicy),
    archivedAt: readNullableString(value.archivedAt),
    createdAt: readNullableString(value.createdAt),
    updatedAt: readNullableString(value.updatedAt),
  };
}

function normalizeIssue(value: JsonRecord, companyIdFallback?: string): RecoveryIssue {
  return {
    id: readString(value.id) ?? "unknown-issue",
    companyId: readString(value.companyId) ?? companyIdFallback ?? "unknown-company",
    projectId: readNullableString(value.projectId),
    goalId: readNullableString(value.goalId),
    parentId: readNullableString(value.parentId),
    title: readString(value.title) ?? "Untitled Issue",
    description: readNullableString(value.description),
    status: readNullableString(value.status),
    priority: readNullableString(value.priority),
    assigneeAgentId: readNullableString(value.assigneeAgentId),
    assigneeUserId: readNullableString(value.assigneeUserId),
    checkoutRunId: readNullableString(value.checkoutRunId),
    executionRunId: readNullableString(value.executionRunId),
    executionAgentNameKey: readNullableString(value.executionAgentNameKey),
    executionLockedAt: readNullableString(value.executionLockedAt),
    createdByAgentId: readNullableString(value.createdByAgentId),
    createdByUserId: readNullableString(value.createdByUserId),
    issueNumber: readNullableNumber(value.issueNumber),
    identifier: readNullableString(value.identifier),
    requestDepth: readNullableNumber(value.requestDepth),
    billingCode: readNullableString(value.billingCode),
    assigneeAdapterOverrides: readNullableRecord(value.assigneeAdapterOverrides),
    executionWorkspaceSettings: readNullableRecord(value.executionWorkspaceSettings),
    startedAt: readNullableString(value.startedAt),
    completedAt: readNullableString(value.completedAt),
    cancelledAt: readNullableString(value.cancelledAt),
    hiddenAt: readNullableString(value.hiddenAt),
    createdAt: readNullableString(value.createdAt),
    updatedAt: readNullableString(value.updatedAt),
  };
}

function normalizeIssueComment(value: JsonRecord, companyIdFallback?: string): RecoveryIssueComment {
  return {
    id: readString(value.id) ?? "unknown-comment",
    companyId: readString(value.companyId) ?? companyIdFallback ?? "unknown-company",
    issueId: readString(value.issueId) ?? "unknown-issue",
    authorAgentId: readNullableString(value.authorAgentId),
    authorUserId: readNullableString(value.authorUserId),
    body: readString(value.body) ?? "",
    createdAt: readNullableString(value.createdAt),
    updatedAt: readNullableString(value.updatedAt),
  };
}

function normalizeApproval(value: JsonRecord, companyIdFallback?: string): RecoveryApproval {
  return {
    id: readString(value.id) ?? "unknown-approval",
    companyId: readString(value.companyId) ?? companyIdFallback ?? "unknown-company",
    type: readString(value.type) ?? "unknown",
    requestedByAgentId: readNullableString(value.requestedByAgentId),
    requestedByUserId: readNullableString(value.requestedByUserId),
    status: readNullableString(value.status),
    payload: readNullableRecord(value.payload) ?? {},
    decisionNote: readNullableString(value.decisionNote),
    decidedByUserId: readNullableString(value.decidedByUserId),
    decidedAt: readNullableString(value.decidedAt),
    createdAt: readNullableString(value.createdAt),
    updatedAt: readNullableString(value.updatedAt),
  };
}

function buildDefaultCompany(
  state: MutableState,
  context: RecoveryContext,
  runMeta: RunMeta,
): RecoveryCompany | null {
  const companyId = context.companyId ?? inferCompanyId(state);
  if (!companyId) return null;

  const issues = [...state.issues.values()];
  const prefix = inferIssuePrefix(issues) ?? "CAS";
  const issueCounter = issues.reduce((max, issue) => Math.max(max, inferIssueNumber(issue)), 0);
  const createdAt = earliestTimestamp([
    runMeta.firstTs,
    ...issues.map((issue) => issue.createdAt ?? null),
    ...state.agents.values().map((agent) => agent.createdAt ?? null),
  ]) ?? new Date(0).toISOString();
  const updatedAt = latestTimestamp([
    runMeta.lastTs,
    ...issues.map((issue) => issue.updatedAt ?? issue.createdAt ?? null),
    ...state.approvals.values().map((approval) => approval.updatedAt ?? approval.createdAt ?? null),
  ]) ?? createdAt;

  return {
    id: companyId,
    name: prefix,
    description: null,
    status: "active",
    issuePrefix: prefix,
    issueCounter,
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    requireBoardApprovalForNewAgents: true,
    brandColor: null,
    createdAt,
    updatedAt,
  };
}

function refreshDerivedCompany(state: MutableState): void {
  const companyId = state.company?.id ?? inferCompanyId(state);
  if (!companyId) return;

  const issuesList = [...state.issues.values()];
  const agentsList = [...state.agents.values()];
  const approvalsList = [...state.approvals.values()];
  const commentsList = [...state.issueComments.values()];
  const runsList = [...state.heartbeatRuns.values()];
  const prefix = inferIssuePrefix(issuesList) ?? state.company?.issuePrefix ?? "CAS";
  const issueCounter = issuesList.reduce((max, issue) => Math.max(max, inferIssueNumber(issue)), 0);
  const createdAt = earliestTimestamp([
    state.company?.createdAt,
    ...issuesList.map((issue) => issue.createdAt ?? null),
    ...agentsList.map((agent) => agent.createdAt ?? null),
    ...approvalsList.map((approval) => approval.createdAt ?? null),
    ...commentsList.map((comment) => comment.createdAt ?? null),
    ...runsList.map((run) => run.createdAt ?? null),
  ]) ?? new Date(0).toISOString();
  const updatedAt = latestTimestamp([
    state.company?.updatedAt,
    ...issuesList.map((issue) => issue.updatedAt ?? issue.createdAt ?? null),
    ...agentsList.map((agent) => agent.updatedAt ?? agent.createdAt ?? null),
    ...approvalsList.map((approval) => approval.updatedAt ?? approval.createdAt ?? null),
    ...commentsList.map((comment) => comment.updatedAt ?? comment.createdAt ?? null),
    ...runsList.map((run) => run.updatedAt ?? run.createdAt ?? null),
  ]) ?? createdAt;

  state.company = {
    id: companyId,
    name: prefix,
    description: state.company?.description ?? null,
    status: state.company?.status ?? "active",
    issuePrefix: prefix,
    issueCounter: Math.max(state.company?.issueCounter ?? 0, issueCounter),
    budgetMonthlyCents: state.company?.budgetMonthlyCents ?? 0,
    spentMonthlyCents: state.company?.spentMonthlyCents ?? 0,
    requireBoardApprovalForNewAgents: state.company?.requireBoardApprovalForNewAgents ?? true,
    brandColor: state.company?.brandColor ?? null,
    createdAt,
    updatedAt,
  };
}

function buildHeartbeatRun(context: RecoveryContext, runMeta: RunMeta): RecoveryHeartbeatRun | null {
  if (!context.runId || !context.companyId || !context.agentId || !runMeta.firstTs) return null;

  const contextSnapshot = runMeta.issueIds.size > 0
    ? { issueId: [...runMeta.issueIds].sort((left, right) => left.localeCompare(right))[0] }
    : null;

  return {
    id: context.runId,
    companyId: context.companyId,
    agentId: context.agentId,
    invocationSource: "recovered_run_log",
    triggerDetail: null,
    status: runMeta.sawTurnCompleted ? "completed" : "completed",
    startedAt: runMeta.firstTs,
    finishedAt: runMeta.lastTs,
    error: null,
    wakeupRequestId: null,
    exitCode: 0,
    signal: null,
    usageJson: runMeta.usageJson,
    resultJson: null,
    sessionIdBefore: null,
    sessionIdAfter: null,
    logStore: "run_log",
    logRef: context.filePath ?? null,
    logBytes: null,
    logSha256: null,
    logCompressed: false,
    stdoutExcerpt: null,
    stderrExcerpt: null,
    errorCode: null,
    externalRunId: null,
    contextSnapshot,
    createdAt: runMeta.firstTs,
    updatedAt: runMeta.lastTs ?? runMeta.firstTs,
  };
}

function extractJsonValues(text: string): JsonValue[] {
  if (!text.trim()) return [];

  const direct = safeJsonParse(text);
  if (direct !== undefined) return [direct];

  const values: JsonValue[] = [];
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  let start = -1;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (start === -1) {
      if (char === "{" || char === "[") {
        start = index;
        stack.push(char === "{" ? "}" : "]");
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char === "{" ? "}" : "]");
      continue;
    }

    if (char === stack.at(-1)) {
      stack.pop();
      if (stack.length === 0) {
        const candidate = text.slice(start, index + 1);
        const parsed = safeJsonParse(candidate);
        if (parsed !== undefined) values.push(parsed);
        start = -1;
      }
    }
  }

  return values;
}

function extractIssueIdFromCommand(command: string): string | null {
  return command.match(issueRe)?.[1] ?? null;
}

function extractIssueApprovalsIssueId(command: string): string | null {
  return command.match(issueApprovalsRe)?.[1] ?? null;
}

function extractIssueCommentFromPatchCommand(
  command: string,
  values: JsonValue[],
  ts: string | null,
  context: RecoveryContext,
): RecoveryIssueComment | null {
  if (!/\bPATCH\b/.test(command)) return null;
  const issueId = extractIssueIdFromCommand(command);
  if (!issueId) return null;

  const commentId = extractStringField(values, "commentId") ?? null;
  if (!commentId) return null;

  const body = extractFirstHeredocBody(command);
  if (!body) return null;

  const createdAt = extractStringField(values, "updatedAt") ?? ts ?? new Date(0).toISOString();
  return {
    id: commentId,
    companyId: context.companyId ?? "unknown-company",
    issueId,
    authorAgentId: context.agentId ?? null,
    authorUserId: null,
    body,
    createdAt,
    updatedAt: createdAt,
  };
}

function extractFirstHeredocBody(command: string): string | null {
  const pattern = /<<['"]?([A-Za-z0-9_]+)['"]?\n([\s\S]*?)\n\1\b/g;
  let match: RegExpExecArray | null = null;
  while (true) {
    const next = pattern.exec(command);
    if (!next) break;
    match = next;
  }
  if (!match) return null;
  const body = match[2]?.replace(/\r/g, "") ?? "";
  return body.trim().length > 0 ? body : null;
}

function extractStringField(value: JsonValue | JsonValue[], fieldName: string): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = extractStringField(item, fieldName);
      if (candidate) return candidate;
    }
    return undefined;
  }

  if (!isRecord(value)) return undefined;

  const direct = value[fieldName];
  if (typeof direct === "string") return direct;

  for (const nestedValue of Object.values(value)) {
    const candidate = extractStringField(nestedValue, fieldName);
    if (candidate) return candidate;
  }

  return undefined;
}

function inferCompanyId(state: MutableState): string | null {
  return state.company?.id
    ?? state.issues.values().next().value?.companyId
    ?? state.agents.values().next().value?.companyId
    ?? state.approvals.values().next().value?.companyId
    ?? null;
}

function inferIssuePrefix(issues: RecoveryIssue[]): string | null {
  for (const issue of issues) {
    if (!issue.identifier) continue;
    const match = /^([A-Z][A-Z0-9_-]*)-\d+$/.exec(issue.identifier);
    if (match) return match[1];
  }
  return null;
}

function inferIssueNumber(issue: RecoveryIssue): number {
  if (typeof issue.issueNumber === "number" && Number.isFinite(issue.issueNumber)) return issue.issueNumber;
  if (issue.identifier) {
    const match = /-(\d+)$/.exec(issue.identifier);
    if (match) return Number(match[1]);
  }
  return 0;
}

function issueApprovalKey(issueId: string, approvalId: string): string {
  return `${issueId}:${approvalId}`;
}

function mergeMutableState(target: MutableState, source: MutableState): void {
  if (source.company) target.company = mergePartialRecord(target.company, source.company);
  mergeByIdMap(target.agents, [...source.agents.values()]);
  mergeByIdMap(target.goals, [...source.goals.values()]);
  mergeByIdMap(target.projects, [...source.projects.values()]);
  mergeByIdMap(target.issues, [...source.issues.values()]);
  mergeByIdMap(target.issueComments, [...source.issueComments.values()]);
  mergeByIdMap(target.approvals, [...source.approvals.values()]);
  for (const link of source.issueApprovals.values()) {
    const key = issueApprovalKey(link.issueId, link.approvalId);
    target.issueApprovals.set(key, mergePartialRecord(target.issueApprovals.get(key), link));
  }
  mergeByIdMap(target.heartbeatRuns, [...source.heartbeatRuns.values()]);
}

function mergeByIdMap<T extends { id: string }>(target: Map<string, T>, values: Iterable<T>): void {
  for (const value of values) {
    target.set(value.id, mergePartialRecord(target.get(value.id), value));
  }
}

function mergePartialRecord<T extends object | undefined>(current: T, incoming: T): T {
  if (!current) return incoming;

  const currentRecord = current as Record<string, unknown>;
  const incomingRecord = incoming as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...currentRecord };
  const incomingUpdatedAt = readTimestamp(incomingRecord.updatedAt ?? incomingRecord.createdAt);
  const currentUpdatedAt = readTimestamp(currentRecord.updatedAt ?? currentRecord.createdAt);
  const preferIncoming = incomingUpdatedAt >= currentUpdatedAt;

  for (const key of Object.keys(incomingRecord)) {
    const hasIncoming = Object.prototype.hasOwnProperty.call(incomingRecord, key);
    if (!hasIncoming) continue;
    const incomingValue = incomingRecord[key];
    if (incomingValue === undefined) continue;
    const currentValue = merged[key];
    if (currentValue === undefined) {
      merged[key] = incomingValue;
      continue;
    }
    if (preferIncoming) {
      merged[key] = incomingValue;
    }
  }

  return merged as T;
}

function finalizeMutableState(state: MutableState): RecoverySnapshot {
  return {
    company: state.company,
    agents: [...state.agents.values()].sort(compareByCreatedAtThenId),
    goals: [...state.goals.values()].sort(compareByCreatedAtThenId),
    projects: [...state.projects.values()].sort(compareByCreatedAtThenId),
    issues: [...state.issues.values()].sort(compareByCreatedAtThenId),
    issueComments: [...state.issueComments.values()].sort(compareByCreatedAtThenId),
    approvals: [...state.approvals.values()].sort(compareByCreatedAtThenId),
    issueApprovals: [...state.issueApprovals.values()].sort((left, right) => {
      const keyCompare = left.issueId.localeCompare(right.issueId);
      if (keyCompare !== 0) return keyCompare;
      return left.approvalId.localeCompare(right.approvalId);
    }),
    heartbeatRuns: [...state.heartbeatRuns.values()].sort(compareByCreatedAtThenId),
  };
}

function compareByCreatedAtThenId<T extends { id: string; createdAt?: string | null }>(left: T, right: T): number {
  const leftCreatedAt = left.createdAt ?? "";
  const rightCreatedAt = right.createdAt ?? "";
  const timeCompare = leftCreatedAt.localeCompare(rightCreatedAt);
  if (timeCompare !== 0) return timeCompare;
  return left.id.localeCompare(right.id);
}

function isAgentCandidate(value: JsonRecord): boolean {
  return typeof value.id === "string"
    && typeof value.companyId === "string"
    && typeof value.name === "string"
    && typeof value.role === "string"
    && ("adapterType" in value || "reportsTo" in value || "urlKey" in value || "status" in value);
}

function isIssueCandidate(value: JsonRecord): boolean {
  const hasIdentity = typeof value.id === "string" && (typeof value.title === "string" || typeof value.identifier === "string");
  const hasIssueShape = "companyId" in value
    || "issueNumber" in value
    || "parentId" in value
    || "status" in value
    || "assigneeAgentId" in value
    || "executionRunId" in value
    || "checkoutRunId" in value;
  return hasIdentity && hasIssueShape;
}

function isIssueCommentCandidate(value: JsonRecord): boolean {
  return typeof value.id === "string"
    && typeof value.issueId === "string"
    && typeof value.body === "string"
    && ("authorAgentId" in value || "authorUserId" in value || "companyId" in value);
}

function isApprovalCandidate(value: JsonRecord): boolean {
  return typeof value.id === "string"
    && typeof value.companyId === "string"
    && typeof value.type === "string"
    && isRecord(value.payload);
}

function isGoalCandidate(value: JsonRecord): boolean {
  return typeof value.id === "string"
    && typeof value.title === "string"
    && ("status" in value || "description" in value);
}

function isProjectCandidate(value: JsonRecord): boolean {
  if (typeof value.id !== "string" || typeof value.name !== "string" || typeof value.companyId !== "string") {
    return false;
  }
  if ("role" in value || "adapterType" in value || "type" in value || "title" in value) {
    return false;
  }
  return "goalId" in value
    || "leadAgentId" in value
    || "executionWorkspacePolicy" in value
    || "targetDate" in value
    || "archivedAt" in value;
}

function safeJsonParse(text: string): JsonValue | undefined {
  try {
    return JSON.parse(text) as JsonValue;
  } catch {
    return undefined;
  }
}

function isRecord(value: JsonValue | undefined): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: JsonValue | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function readNullableString(value: JsonValue | undefined): string | null | undefined {
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

function readNullableNumber(value: JsonValue | undefined): number | null | undefined {
  if (value === null) return null;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readNullableRecord(value: JsonValue | undefined): JsonRecord | null | undefined {
  if (value === null) return null;
  return isRecord(value) ? value : undefined;
}

function readTimestamp(value: unknown): number {
  if (typeof value !== "string") return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function earliestTimestamp(values: Array<string | null | undefined>): string | null {
  const filtered = values.filter((value): value is string => typeof value === "string" && value.length > 0);
  if (filtered.length === 0) return null;
  return filtered.sort((left, right) => left.localeCompare(right))[0];
}

function latestTimestamp(values: Array<string | null | undefined>): string | null {
  const filtered = values.filter((value): value is string => typeof value === "string" && value.length > 0);
  if (filtered.length === 0) return null;
  return filtered.sort((left, right) => right.localeCompare(left))[0];
}
