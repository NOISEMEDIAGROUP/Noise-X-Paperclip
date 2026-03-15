import { appendFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { resolveDefaultAgentWorkspaceDir } from "../home-paths.js";
import {
  extractSessionCookie,
  resolveHarnessBoardCredentials,
} from "./orchestration-auth.js";
import {
  renderSuiteReport,
  type ScenarioCheckpoint,
  type ScenarioSummary,
} from "./orchestration-report.js";
import {
  formatScenarioCatalog,
  resolveScenarioSelection,
  summarizeSuiteRuns,
  validateScenarioRequirements,
  type OrchestrationScenarioId,
  type OrchestrationSuiteId,
} from "./orchestration-suite.js";

type JsonRecord = Record<string, unknown>;

interface CompanyRecord {
  id: string;
  name: string;
}

interface AgentRecord {
  id: string;
  name: string;
  role: string | null;
  status: string;
  adapterType: string;
  adapterConfig: JsonRecord | null;
  shortName?: string | null;
}

interface IssueRecord {
  id: string;
  identifier?: string | null;
  title: string;
  description: string | null;
  status: string;
  assigneeAgentId: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface IssueCommentRecord {
  id: string;
  issueId: string;
  body: string;
  authorAgentId: string | null;
  authorUserId: string | null;
  createdAt: string;
}

interface HeartbeatRunRecord {
  id: string;
  agentId: string;
  status: string;
  invocationSource: string;
  triggerDetail: string | null;
  wakeupRequestId: string | null;
  error: string | null;
  errorCode: string | null;
  logRef: string | null;
  logBytes: number | null;
  stdoutExcerpt: string | null;
  stderrExcerpt: string | null;
  contextSnapshot: JsonRecord | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

interface WakeupRequestRecord {
  id: string;
  agentId: string;
  status: string;
  source: string;
  triggerDetail: string | null;
  reason: string | null;
  runId: string | null;
  payload: JsonRecord | null;
  requestedAt: string;
  claimedAt: string | null;
  finishedAt: string | null;
  error: string | null;
}

interface RunEventRecord {
  id: number;
  seq: number;
  runId: string;
  agentId: string;
  eventType: string;
  stream: string | null;
  level: string | null;
  message: string | null;
  payload: JsonRecord | null;
  createdAt: string;
}

interface RunLogReadResult {
  runId: string;
  store: string;
  logRef: string;
  content: string;
  nextOffset?: number;
}

interface ManualRecoverRunsResult {
  recoveredCount: number;
  runIds: string[];
  wakeupRequestIds: string[];
  reason: string;
  recoveredAt: string;
}

interface ApprovalRecord {
  id: string;
  type: string;
  status: string;
  requestedByAgentId: string | null;
  payload: JsonRecord;
}

interface AdapterEnvironmentCheck {
  code: string;
  level: string;
  message: string;
  detail?: string;
  hint?: string;
}

interface AdapterEnvironmentResult {
  adapterType: string;
  status: "pass" | "warn" | "fail";
  checks: AdapterEnvironmentCheck[];
  testedAt: string;
}

interface LiveEventEnvelope {
  id: number;
  companyId: string;
  type: string;
  createdAt: string;
  payload: JsonRecord;
}

interface TimelineEvent {
  ts: string;
  elapsedMs: number;
  source: string;
  category: string;
  message: string;
  data?: JsonRecord | undefined;
}

interface HarnessOptions {
  scenario?: OrchestrationScenarioId;
  suite?: OrchestrationSuiteId;
  baseUrl: string;
  companyId?: string;
  agent?: string;
  parentAgent?: string;
  childAgent?: string;
  childAgents: string[];
  grandchildAgent?: string;
  authHeader?: string;
  cookie?: string;
  email?: string;
  password?: string;
  timeoutSec: number;
  pollIntervalMs: number;
  artifactRoot: string;
  probeAllAgents: boolean;
  keepIssues: boolean;
  listScenarios: boolean;
}

const SAFE_HTTP_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const ARTIFACT_TIME_ZONE = "America/New_York";
let stopRequestedBySignal: NodeJS.Signals | null = null;

function nowIso() {
  return new Date().toISOString();
}

function formatArtifactTimestampEt(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ARTIFACT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).formatToParts(date);

  const lookup = new Map(parts.map((part) => [part.type, part.value]));
  const year = lookup.get("year") ?? "0000";
  const month = lookup.get("month") ?? "00";
  const day = lookup.get("day") ?? "00";
  const hour = lookup.get("hour") ?? "00";
  const minute = lookup.get("minute") ?? "00";
  const second = lookup.get("second") ?? "00";
  const zone = (lookup.get("timeZoneName") ?? "ET").replace(/\s+/g, "");
  const millis = String(date.getMilliseconds()).padStart(3, "0");
  return `${year}-${month}-${day}_${hour}-${minute}-${second}-${millis}_${zone}`;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonRecord;
}

function asRecordArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function excerpt(value: string, max = 160) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, Math.max(0, max - 3))}...`;
}

function parseJson(text: string): unknown {
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function formatElapsed(ms: number) {
  return `+${(ms / 1000).toFixed(1).padStart(6, " ")}s`;
}

function ensureArrayResponse<T extends JsonRecord>(value: unknown): T[] {
  if (Array.isArray(value)) return value.map((item) => item as T);
  const record = asRecord(value);
  for (const key of ["items", "data", "agents", "companies", "comments"]) {
    if (Array.isArray(record[key])) return (record[key] as unknown[]).map((item) => item as T);
    if (key === "data") {
      const dataRecord = asRecord(record[key]);
      if (Array.isArray(dataRecord.items)) return dataRecord.items.map((item) => item as T);
    }
  }
  return [];
}

function isTerminalIssueStatus(status: string | null | undefined) {
  return status === "closed" || status === "cancelled";
}

export function readIssueIdFromPayload(payload: JsonRecord | null | undefined) {
  return (
    asString(payload ? payload.issueId : null)
    ?? asString(payload ? payload.taskId : null)
    ?? asString(payload ? payload.parentIssueId : null)
    ?? asString(payload ? payload.parentId : null)
  );
}

function wakeupStatusFromRunStatus(status: string) {
  switch (status) {
    case "queued":
      return "queued";
    case "running":
      return "claimed";
    case "succeeded":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "failed":
    case "timed_out":
      return "failed";
    default:
      return "queued";
  }
}

function wakeupFromRun(run: HeartbeatRunRecord): WakeupRequestRecord | null {
  const wakeupId = asString(run.wakeupRequestId);
  if (!wakeupId) return null;
  return {
    id: wakeupId,
    agentId: run.agentId,
    status: wakeupStatusFromRunStatus(run.status),
    source: run.invocationSource ?? "unknown",
    triggerDetail: run.triggerDetail,
    reason: null,
    runId: run.id,
    payload: run.contextSnapshot ? { ...run.contextSnapshot } : null,
    requestedAt: run.createdAt,
    claimedAt: run.startedAt,
    finishedAt: run.finishedAt,
    error: run.error,
  };
}

function ensureDateString(value: unknown) {
  const text = asString(value);
  if (!text) return null;
  return Number.isNaN(Date.parse(text)) ? null : text;
}

function splitCsv(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function ensureAgentWorkspace(agentId: string) {
  return resolveDefaultAgentWorkspaceDir(agentId);
}

function dateMs(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function lineContainsAll(line: string, needles: string[]) {
  const haystack = line.toLowerCase();
  return needles.every((needle) => haystack.includes(needle.toLowerCase()));
}

function collectStringLeaves(value: unknown, out: string[] = []) {
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectStringLeaves(entry, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) collectStringLeaves(entry, out);
  }
  return out;
}

async function readTextIfExists(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function pathExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function runWindow(run: HeartbeatRunRecord) {
  const start = dateMs(run.startedAt ?? run.createdAt);
  const end = dateMs(run.finishedAt ?? run.startedAt ?? run.createdAt);
  if (start === null || end === null) return null;
  return { start, end: Math.max(start, end) };
}

function runsOverlap(left: HeartbeatRunRecord, right: HeartbeatRunRecord) {
  const leftWindow = runWindow(left);
  const rightWindow = runWindow(right);
  if (!leftWindow || !rightWindow) return false;
  return Math.max(leftWindow.start, rightWindow.start) <= Math.min(leftWindow.end, rightWindow.end);
}

function findOverlapPair(runs: HeartbeatRunRecord[]) {
  for (let idx = 0; idx < runs.length; idx += 1) {
    for (let jdx = idx + 1; jdx < runs.length; jdx += 1) {
      if (runsOverlap(runs[idx]!, runs[jdx]!)) {
        return [runs[idx]!, runs[jdx]!] as const;
      }
    }
  }
  return null;
}

function issueAssigneeName(issue: IssueRecord, agentsById: Map<string, AgentRecord>) {
  const agentId = issue.assigneeAgentId;
  if (!agentId) return "unassigned";
  return agentsById.get(agentId)?.name ?? agentId;
}

class ArtifactWriter {
  private readonly ensured = new Set<string>();

  constructor(readonly baseDir: string) {}

  private async ensureDirFor(filePath: string) {
    const dir = path.dirname(filePath);
    if (this.ensured.has(dir)) return;
    await mkdir(dir, { recursive: true });
    this.ensured.add(dir);
  }

  async appendJsonl(relativePath: string, value: unknown) {
    const target = path.join(this.baseDir, relativePath);
    await this.ensureDirFor(target);
    const line = `${JSON.stringify(value)}\n`;
    await appendFile(target, line, "utf8");
  }

  async writeJson(relativePath: string, value: unknown) {
    const target = path.join(this.baseDir, relativePath);
    await this.ensureDirFor(target);
    await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  }

  async writeText(relativePath: string, value: string) {
    const target = path.join(this.baseDir, relativePath);
    await this.ensureDirFor(target);
    await writeFile(target, value, "utf8");
  }
}

class Timeline {
  readonly startedAtMs = Date.now();
  private readonly events: TimelineEvent[] = [];
  private writeChain = Promise.resolve();

  constructor(private readonly writer: ArtifactWriter) {}

  record(source: string, category: string, message: string, data?: JsonRecord) {
    const event: TimelineEvent = {
      ts: nowIso(),
      elapsedMs: Date.now() - this.startedAtMs,
      source,
      category,
      message,
      data,
    };
    this.events.push(event);
    console.log(`${formatElapsed(event.elapsedMs)} [${source.padEnd(4, " ")}] [${category.padEnd(9, " ")}] ${message}`);
    this.writeChain = this.writeChain.then(() => this.writer.appendJsonl("timeline.ndjson", event));
  }

  async flush() {
    await this.writeChain;
  }

  all() {
    return [...this.events];
  }
}

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
  }
}

class ApiClient {
  private cookieHeader: string | null = null;
  private authorizationHeader: string | null = null;
  private readonly origin: string;

  constructor(
    readonly baseUrl: string,
    opts?: { cookie?: string | null; authHeader?: string | null },
  ) {
    this.origin = new URL(baseUrl).origin;
    this.cookieHeader = opts?.cookie?.trim() || null;
    this.authorizationHeader = opts?.authHeader?.trim() || null;
  }

  private captureCookie(response: Response) {
    const raw = response.headers.get("set-cookie");
    if (!raw) return;
    const cookie = extractSessionCookie(raw);
    if (cookie) this.cookieHeader = cookie;
  }

  private buildHeaders(method: string, hasBody: boolean) {
    const headers = new Headers({ Accept: "application/json" });
    if (this.cookieHeader) headers.set("Cookie", this.cookieHeader);
    if (this.authorizationHeader) headers.set("Authorization", this.authorizationHeader);
    if (!SAFE_HTTP_METHODS.has(method.toUpperCase())) {
      headers.set("Origin", this.origin);
      headers.set("Referer", `${this.origin}/`);
    }
    if (hasBody) headers.set("Content-Type", "application/json");
    return headers;
  }

  async request<T>(
    method: string,
    pathname: string,
    opts?: {
      query?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
      allowStatus?: number[];
      timeoutMs?: number;
    },
  ): Promise<{ status: number; data: T }> {
    const url = new URL(pathname, this.baseUrl);
    for (const [key, value] of Object.entries(opts?.query ?? {})) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
    const hasBody = opts?.body !== undefined;
    const requestTimeoutMs = opts?.timeoutMs ?? 120_000;
    const controller = new AbortController();
    const requestTimeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    const response = await fetch(url, {
      method,
      headers: this.buildHeaders(method, hasBody),
      body: hasBody ? JSON.stringify(opts?.body) : undefined,
      signal: controller.signal,
    }).finally(() => clearTimeout(requestTimeout));
    this.captureCookie(response);
    const text = await response.text();
    const data = parseJson(text) as T;
    const allowed = new Set([...(opts?.allowStatus ?? []), ...Array.from({ length: 100 }, (_, idx) => idx + 200)]);
    if (!allowed.has(response.status)) {
      const bodyRecord = asRecord(data);
      const detail = asString(bodyRecord.error) ?? excerpt(text, 240) ?? "request failed";
      throw new ApiError(`${method.toUpperCase()} ${url.pathname} -> ${response.status}: ${detail}`, response.status, data);
    }
    return { status: response.status, data };
  }

  async authenticate(timeline: Timeline, email?: string, password?: string) {
    const session = await this.request<JsonRecord>("GET", "/api/auth/get-session", { allowStatus: [401] });
    if (session.status === 200) {
      timeline.record(
        "api",
        "auth",
        this.authorizationHeader || this.cookieHeader
          ? "Using configured board auth"
          : "Using existing board session",
      );
      return;
    }

    if (this.authorizationHeader || this.cookieHeader) {
      throw new Error("Configured board auth did not resolve a board session.");
    }

    const creds = resolveHarnessBoardCredentials({
      baseUrl: this.baseUrl,
      cliEmail: email,
      cliPassword: password,
      envEmail: process.env.BOARD_EMAIL,
      envPassword: process.env.BOARD_PASSWORD,
    });
    const boardEmail = creds.email;
    const boardPassword = creds.password;

    await this.request("POST", "/api/auth/sign-up/email", {
      body: { email: boardEmail, password: boardPassword, name: "Paperclip Harness" },
      allowStatus: [400, 404, 409, 422],
    });
    await this.request("POST", "/api/auth/sign-in/email", {
      body: { email: boardEmail, password: boardPassword },
    });
    await this.request("GET", "/api/auth/get-session");
    timeline.record(
      "api",
      "auth",
      creds.source === "local-default"
        ? `Authenticated local default board user ${boardEmail}`
        : `Authenticated board user ${boardEmail}`,
    );
  }

  async health() {
    return (await this.request<JsonRecord>("GET", "/api/health")).data;
  }

  async listCompanies() {
    const data = (await this.request<unknown>("GET", "/api/companies")).data;
    return ensureArrayResponse<JsonRecord>(data).map((row) => ({
      id: String(row.id),
      name: String(row.name ?? row.id),
    })) as CompanyRecord[];
  }

  async listAgents(companyId: string) {
    const data = (await this.request<unknown>("GET", `/api/companies/${companyId}/agents`)).data;
    return ensureArrayResponse<JsonRecord>(data).map((row) => ({
      id: String(row.id),
      name: String(row.name ?? row.id),
      role: asString(row.role),
      status: String(row.status ?? "unknown"),
      adapterType: String(row.adapterType ?? "unknown"),
      adapterConfig: row.adapterConfig ? asRecord(row.adapterConfig) : null,
      shortName: asString(row.shortName),
    })) as AgentRecord[];
  }

  async listIssues(companyId: string, q?: string) {
    const data = (await this.request<unknown>("GET", `/api/companies/${companyId}/issues`, {
      query: { q },
    })).data;
    return ensureArrayResponse<JsonRecord>(data).map((row) => ({
      id: String(row.id),
      identifier: asString(row.identifier),
      title: String(row.title ?? row.id),
      description: asString(row.description),
      status: String(row.status ?? "unknown"),
      assigneeAgentId: asString(row.assigneeAgentId),
      parentId: asString(row.parentId),
      createdAt: ensureDateString(row.createdAt) ?? nowIso(),
      updatedAt: ensureDateString(row.updatedAt) ?? nowIso(),
    })) as IssueRecord[];
  }

  async getIssueComments(issueId: string) {
    const data = (await this.request<unknown>("GET", `/api/issues/${issueId}/comments`, { allowStatus: [404] })).data;
    return ensureArrayResponse<JsonRecord>(data).map((row) => ({
      id: String(row.id),
      issueId: String(row.issueId ?? issueId),
      body: String(row.body ?? ""),
      authorAgentId: asString(row.authorAgentId),
      authorUserId: asString(row.authorUserId),
      createdAt: ensureDateString(row.createdAt) ?? nowIso(),
    })) as IssueCommentRecord[];
  }

  async getIssue(issueId: string) {
    const response = await this.request<JsonRecord>("GET", `/api/issues/${issueId}`, { allowStatus: [404] });
    if (response.status === 404) return null;
    const row = response.data;
    return {
      id: String(row.id),
      identifier: asString(row.identifier),
      title: String(row.title ?? row.id),
      description: asString(row.description),
      status: String(row.status ?? "unknown"),
      assigneeAgentId: asString(row.assigneeAgentId),
      parentId: asString(row.parentId),
      createdAt: ensureDateString(row.createdAt) ?? nowIso(),
      updatedAt: ensureDateString(row.updatedAt) ?? nowIso(),
    } as IssueRecord;
  }

  async createIssue(
    companyId: string,
    body: {
      title: string;
      description: string;
      assigneeAgentId: string;
      parentId?: string;
      status?: string;
    },
  ) {
    const data = (await this.request<JsonRecord>("POST", `/api/companies/${companyId}/issues`, {
      body,
    })).data;
    return {
      id: String(data.id),
      title: String(data.title ?? body.title),
      parentId: asString(data.parentId),
    };
  }

  async deleteIssue(issueId: string) {
    await this.request("DELETE", `/api/issues/${issueId}`, { allowStatus: [404] });
  }

  async listRuns(companyId: string, limit = 200) {
    const data = (await this.request<unknown>("GET", `/api/companies/${companyId}/heartbeat-runs`, {
      query: { limit },
    })).data;
    return ensureArrayResponse<JsonRecord>(data).map((row) => ({
      id: String(row.id),
      agentId: String(row.agentId),
      status: String(row.status ?? "unknown"),
      invocationSource: String(row.invocationSource ?? "unknown"),
      triggerDetail: asString(row.triggerDetail),
      wakeupRequestId: asString(row.wakeupRequestId),
      error: asString(row.error),
      errorCode: asString(row.errorCode),
      logRef: asString(row.logRef),
      logBytes: typeof row.logBytes === "number" ? row.logBytes : null,
      stdoutExcerpt: asString(row.stdoutExcerpt),
      stderrExcerpt: asString(row.stderrExcerpt),
      contextSnapshot: row.contextSnapshot ? asRecord(row.contextSnapshot) : null,
      createdAt: ensureDateString(row.createdAt) ?? nowIso(),
      startedAt: ensureDateString(row.startedAt),
      finishedAt: ensureDateString(row.finishedAt),
    })) as HeartbeatRunRecord[];
  }

  async listWakeups(
    companyId: string,
    opts?: { after?: string; limit?: number; issueId?: string; agentId?: string; status?: string },
  ) {
    const data = (await this.request<unknown>("GET", `/api/companies/${companyId}/wakeup-requests`, {
      query: opts,
    })).data;
    return ensureArrayResponse<JsonRecord>(data).map((row) => ({
      id: String(row.id),
      agentId: String(row.agentId),
      status: String(row.status ?? "unknown"),
      source: String(row.source ?? "unknown"),
      triggerDetail: asString(row.triggerDetail),
      reason: asString(row.reason),
      runId: asString(row.runId),
      payload: row.payload ? asRecord(row.payload) : null,
      requestedAt: ensureDateString(row.requestedAt) ?? nowIso(),
      claimedAt: ensureDateString(row.claimedAt),
      finishedAt: ensureDateString(row.finishedAt),
      error: asString(row.error),
    })) as WakeupRequestRecord[];
  }

  async cancelRun(runId: string) {
    await this.request("POST", `/api/heartbeat-runs/${runId}/cancel`, { allowStatus: [404, 409] });
  }

  async manualRecoverRuns(
    companyId: string,
    body: {
      runIds?: string[];
      agentId?: string | null;
      olderThanMs?: number;
      reason?: string | null;
    },
  ) {
    const response = await this.request<ManualRecoverRunsResult>(
      "POST",
      `/api/companies/${companyId}/heartbeat-runs/manual-recover`,
      {
        body,
        allowStatus: [400],
      },
    );
    if (response.status === 400) {
      throw new Error("Manual recovery request rejected with status 400");
    }
    return response.data;
  }

  async createApproval(
    companyId: string,
    body: {
      type: "hire_agent" | "approve_ceo_strategy" | "request_permission_escalation";
      requestedByAgentId?: string | null;
      payload: JsonRecord;
      issueIds?: string[];
    },
  ) {
    const data = (await this.request<JsonRecord>("POST", `/api/companies/${companyId}/approvals`, {
      body,
    })).data;
    return {
      id: String(data.id),
      type: String(data.type ?? body.type),
      status: String(data.status ?? "pending"),
      requestedByAgentId: asString(data.requestedByAgentId),
      payload: asRecord(data.payload),
    } as ApprovalRecord;
  }

  async listApprovalIssues(approvalId: string) {
    const data = (await this.request<unknown>("GET", `/api/approvals/${approvalId}/issues`)).data;
    return ensureArrayResponse<JsonRecord>(data).map((row) => ({
      id: String(row.id),
    }));
  }

  async cancelApproval(approvalId: string, decisionNote?: string) {
    const data = (await this.request<JsonRecord>("POST", `/api/approvals/${approvalId}/cancel`, {
      body: decisionNote ? { decisionNote } : {},
    })).data;
    return {
      id: String(data.id),
      status: String(data.status ?? "cancelled"),
    };
  }

  async listRunEvents(runId: string) {
    const data = (await this.request<unknown>("GET", `/api/heartbeat-runs/${runId}/events`, {
      query: { afterSeq: 0, limit: 1000 },
    })).data;
    return ensureArrayResponse<JsonRecord>(data).map((row) => ({
      id: Number(row.id ?? 0),
      seq: Number(row.seq ?? 0),
      runId: String(row.runId ?? runId),
      agentId: String(row.agentId ?? ""),
      eventType: String(row.eventType ?? "unknown"),
      stream: asString(row.stream),
      level: asString(row.level),
      message: asString(row.message),
      payload: row.payload ? asRecord(row.payload) : null,
      createdAt: ensureDateString(row.createdAt) ?? nowIso(),
    })) as RunEventRecord[];
  }

  async readRunLog(runId: string, offset = 0, limitBytes = 256_000) {
    const response = await this.request<RunLogReadResult>("GET", `/api/heartbeat-runs/${runId}/log`, {
        query: { offset, limitBytes },
        allowStatus: [404],
      });
    if (response.status === 404) return null;
    return response.data;
  }

  async testAdapterEnvironment(companyId: string, agent: AgentRecord) {
    // Allow up to 150s: covers model discovery (20s) + hello probe (60s + 5s grace) + margin
    return (
      await this.request<AdapterEnvironmentResult>(
        "POST",
        `/api/companies/${companyId}/adapters/${encodeURIComponent(agent.adapterType)}/test-environment`,
        {
          body: {
            adapterConfig: agent.adapterConfig ?? {},
          },
          timeoutMs: 150_000,
        },
      )
    ).data;
  }

  websocketHeaders() {
    const headers: Record<string, string> = {};
    if (this.cookieHeader) headers.Cookie = this.cookieHeader;
    if (this.authorizationHeader) headers.Authorization = this.authorizationHeader;
    return Object.keys(headers).length > 0 ? headers : undefined;
  }
}

class CleanupManager {
  private readonly issueIds = new Set<string>();
  private readonly runIds = new Set<string>();
  private executed = false;

  noteIssue(issueId: string) {
    this.issueIds.add(issueId);
  }

  noteRun(runId: string) {
    this.runIds.add(runId);
  }

  issueIdList() {
    return [...this.issueIds];
  }

  runIdList() {
    return [...this.runIds];
  }

  async cleanup(
    client: ApiClient,
    timeline: Timeline,
    observedIssues: IssueRecord[],
    keepIssues: boolean,
  ) {
    if (this.executed) return;
    this.executed = true;

    for (const runId of this.runIds) {
      try {
        await client.cancelRun(runId);
        timeline.record("api", "cleanup", `Cancel requested for run ${runId}`);
      } catch (err) {
        timeline.record("api", "cleanup", `Run cancel failed for ${runId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (keepIssues) {
      timeline.record("api", "cleanup", "Keeping test issues as requested");
      return;
    }

    const issueDepth = new Map<string, number>();
    const issueById = new Map(observedIssues.map((issue) => [issue.id, issue]));
    const depthOf = (issueId: string): number => {
      const cached = issueDepth.get(issueId);
      if (cached !== undefined) return cached;
      const issue = issueById.get(issueId);
      const depth = issue?.parentId ? depthOf(issue.parentId) + 1 : 0;
      issueDepth.set(issueId, depth);
      return depth;
    };

    const orderedIssues = [...this.issueIds].sort((left, right) => depthOf(right) - depthOf(left));
    for (const issueId of orderedIssues) {
      try {
        await client.deleteIssue(issueId);
        timeline.record("api", "cleanup", `Deleted test issue ${issueId}`);
      } catch (err) {
        timeline.record("api", "cleanup", `Issue delete failed for ${issueId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}

class ScenarioObserver {
  private ws: WebSocket | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private polling = false;
  private readonly trackedAgentIds = new Set<string>();
  private readonly trackedIssueIds = new Set<string>();
  private readonly issues = new Map<string, IssueRecord>();
  private readonly comments = new Map<string, IssueCommentRecord>();
  private readonly runs = new Map<string, HeartbeatRunRecord>();
  private readonly wakeups = new Map<string, WakeupRequestRecord>();
  private readonly agentStatuses = new Map<string, string>();
  private readonly issueTerminalTransitionAtMs = new Map<string, number>();

  constructor(
    private readonly client: ApiClient,
    private readonly writer: ArtifactWriter,
    private readonly timeline: Timeline,
    private readonly companyId: string,
    private readonly tag: string,
    initialAgents: AgentRecord[],
    private readonly pollIntervalMs: number,
    private readonly cleanup: CleanupManager,
  ) {
    for (const agent of initialAgents) {
      this.trackedAgentIds.add(agent.id);
      this.agentStatuses.set(agent.id, agent.status);
    }
  }

  addTrackedAgent(agentId: string) {
    this.trackedAgentIds.add(agentId);
  }

  trackIssue(issueId: string) {
    this.trackedIssueIds.add(issueId);
  }

  issueList() {
    return [...this.issues.values()];
  }

  runList() {
    return [...this.runs.values()];
  }

  wakeupList() {
    return [...this.wakeups.values()];
  }

  commentsForIssue(issueId: string) {
    return [...this.comments.values()].filter((comment) => comment.issueId === issueId);
  }

  getIssue(issueId: string) {
    return this.issues.get(issueId) ?? null;
  }

  getAgentStatus(agentId: string) {
    return this.agentStatuses.get(agentId) ?? null;
  }

  issueTerminalTransitionAt(issueId: string) {
    return this.issueTerminalTransitionAtMs.get(issueId) ?? null;
  }

  async start() {
    await this.connectWebSocket();
    await this.pollOnce();
    this.pollTimer = setInterval(() => {
      void this.pollOnce();
    }, this.pollIntervalMs);
  }

  async stop() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private async connectWebSocket() {
    const httpUrl = new URL(this.client.baseUrl);
    const protocol = httpUrl.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${httpUrl.host}/api/companies/${encodeURIComponent(this.companyId)}/events/ws`;
    const headers = this.client.websocketHeaders();
    try {
      this.ws = new WebSocket(wsUrl, { headers });
      this.ws.on("open", () => {
        this.timeline.record("ws", "connect", "Live event stream connected");
      });
      this.ws.on("message", (raw) => {
        void this.handleLiveMessage(raw.toString());
      });
      this.ws.on("error", (err) => {
        this.timeline.record("ws", "error", `Live event stream error: ${err.message}`);
      });
      this.ws.on("close", () => {
        this.timeline.record("ws", "close", "Live event stream closed");
      });
    } catch (err) {
      this.timeline.record("ws", "error", `Live event stream unavailable: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async handleLiveMessage(raw: string) {
    const parsed = parseJson(raw);
    const event = asRecord(parsed) as unknown as LiveEventEnvelope;
    await this.writer.appendJsonl("live-events.ndjson", event);
    const payload = asRecord(event.payload);
    const runId = asString(payload.runId);
    const agentId = asString(payload.agentId);
    const relevant =
      (runId && this.runs.has(runId)) ||
      (agentId && this.trackedAgentIds.has(agentId));
    if (!relevant) return;

    if (event.type === "heartbeat.run.log") {
      const chunk = asString(payload.chunk);
      if (chunk) {
        this.timeline.record(
          "ws",
          "run.log",
          `${payload.stream ?? "stdout"} ${runId ?? "unknown"}: ${excerpt(chunk, 200)}`,
        );
      }
      return;
    }

    if (event.type === "heartbeat.run.status") {
      this.timeline.record("ws", "run.status", `${runId ?? "run"} -> ${payload.status ?? "unknown"}`);
      return;
    }

    if (event.type === "heartbeat.run.event") {
      this.timeline.record("ws", "run.event", `${runId ?? "run"} ${payload.message ?? payload.eventType ?? "event"}`);
      return;
    }

    if (event.type === "heartbeat.run.queued") {
      this.timeline.record("ws", "run.queue", `Queued run ${runId ?? "unknown"} for agent ${agentId ?? "unknown"}`);
      return;
    }

    if (event.type === "agent.status" && agentId) {
      this.timeline.record("ws", "agent", `Agent ${agentId} -> ${payload.status ?? "unknown"}`);
    }
  }

  private runIssueId(run: HeartbeatRunRecord) {
    return readIssueIdFromPayload(run.contextSnapshot);
  }

  private wakeupIssueId(wakeup: WakeupRequestRecord) {
    return readIssueIdFromPayload(wakeup.payload);
  }

  async pollOnce() {
    if (this.polling) return;
    this.polling = true;
    try {
      const taggedIssues = (await this.client.listIssues(this.companyId, this.tag)).filter(
        (issue) =>
          issue.title.includes(this.tag) ||
          (issue.description?.includes(this.tag) ?? false) ||
          this.issues.has(issue.id),
      );
      const trackedIssues = await Promise.all(
        [...this.trackedIssueIds]
          .filter((issueId) => !taggedIssues.some((issue) => issue.id === issueId))
          .map((issueId) => this.client.getIssue(issueId)),
      );
      const issues = [...taggedIssues, ...trackedIssues.filter((issue): issue is IssueRecord => Boolean(issue))];
      for (const issue of issues) {
        if (issue.assigneeAgentId) this.trackedAgentIds.add(issue.assigneeAgentId);
      }
      await this.captureIssues(issues);

      const [commentsByIssue, agents, runs, wakeups] = await Promise.all([
        Promise.all(issues.map(async (issue) => ({ issueId: issue.id, comments: await this.client.getIssueComments(issue.id) }))),
        this.client.listAgents(this.companyId),
        this.client.listRuns(this.companyId),
        this.client.listWakeups(this.companyId, { after: new Date(this.timeline.startedAtMs).toISOString(), limit: 300 }),
      ]);

      for (const { comments } of commentsByIssue) {
        await this.captureComments(comments);
      }
      await this.captureAgents(agents.filter((agent) => this.trackedAgentIds.has(agent.id)));
      const scenarioStartMs = this.timeline.startedAtMs;
      const relevantRuns = runs.filter((run) => {
        const runTimestampMs = dateMs(run.createdAt) ?? dateMs(run.startedAt ?? run.finishedAt) ?? 0;
        const withinScenarioWindow = runTimestampMs >= scenarioStartMs || this.runs.has(run.id);
        if (!withinScenarioWindow) return false;
        const runIssueId = this.runIssueId(run);
        return this.trackedAgentIds.has(run.agentId) || (runIssueId ? this.issues.has(runIssueId) : false);
      });
      const relevantWakeups = wakeups.filter((wakeup) => {
        const issueId = this.wakeupIssueId(wakeup);
        return this.trackedAgentIds.has(wakeup.agentId) || (issueId ? this.issues.has(issueId) : false);
      });
      const synthesizedWakeups = this.synthesizeWakeupsFromRuns(relevantRuns, relevantWakeups);

      await this.captureRuns(relevantRuns);
      if (relevantWakeups.length === 0 && synthesizedWakeups.length > 0) {
        this.timeline.record(
          "api",
          "wakeup",
          `Wakeup list endpoint returned no rows; synthesized ${synthesizedWakeups.length} wakeup(s) from run metadata`,
        );
      }
      await this.captureWakeups([...relevantWakeups, ...synthesizedWakeups]);
    } catch (err) {
      this.timeline.record("api", "poll", `Observer poll failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.polling = false;
    }
  }

  private async captureIssues(current: IssueRecord[]) {
    for (const issue of current) {
      const previous = this.issues.get(issue.id);
      if (!previous) {
        this.issues.set(issue.id, issue);
        this.trackedIssueIds.add(issue.id);
        this.cleanup.noteIssue(issue.id);
        if (isTerminalIssueStatus(issue.status)) {
          this.issueTerminalTransitionAtMs.set(issue.id, dateMs(issue.updatedAt) ?? Date.now());
        }
        this.timeline.record(
          "api",
          "issue",
          `Issue ${issue.identifier ?? issue.id} created: ${excerpt(issue.title, 120)}`,
          {
            issueId: issue.id,
            parentId: issue.parentId ?? undefined,
            assigneeAgentId: issue.assigneeAgentId ?? undefined,
          },
        );
        continue;
      }
      if (previous.status !== issue.status) {
        this.timeline.record(
          "api",
          "issue",
          `Issue ${issue.identifier ?? issue.id} status ${previous.status} -> ${issue.status}`,
          { issueId: issue.id },
        );
        if (isTerminalIssueStatus(issue.status)) {
          this.issueTerminalTransitionAtMs.set(issue.id, dateMs(issue.updatedAt) ?? Date.now());
        } else {
          this.issueTerminalTransitionAtMs.delete(issue.id);
        }
      }
      if (previous.assigneeAgentId !== issue.assigneeAgentId) {
        this.timeline.record(
          "api",
          "issue",
          `Issue ${issue.identifier ?? issue.id} assignee ${previous.assigneeAgentId ?? "none"} -> ${issue.assigneeAgentId ?? "none"}`,
          { issueId: issue.id },
        );
      }
      this.issues.set(issue.id, issue);
    }
  }

  private async captureComments(current: IssueCommentRecord[]) {
    for (const comment of current) {
      if (this.comments.has(comment.id)) continue;
      this.comments.set(comment.id, comment);
      this.timeline.record(
        "api",
        "comment",
        `Comment on ${comment.issueId} by ${comment.authorAgentId ?? comment.authorUserId ?? "unknown"}: ${excerpt(comment.body, 200)}`,
        { issueId: comment.issueId, commentId: comment.id },
      );
    }
  }

  private async captureAgents(current: AgentRecord[]) {
    for (const agent of current) {
      const previous = this.agentStatuses.get(agent.id);
      if (previous !== undefined && previous !== agent.status) {
        this.timeline.record("api", "agent", `Agent ${agent.name} status ${previous} -> ${agent.status}`, {
          agentId: agent.id,
        });
      }
      this.agentStatuses.set(agent.id, agent.status);
    }
  }

  private async captureRuns(current: HeartbeatRunRecord[]) {
    for (const run of current) {
      const previous = this.runs.get(run.id);
      if (!previous) {
        this.runs.set(run.id, run);
        this.cleanup.noteRun(run.id);
        this.timeline.record("api", "run", `Run ${run.id} created for agent ${run.agentId} (${run.status})`, {
          runId: run.id,
          issueId: this.runIssueId(run) ?? undefined,
        });
        continue;
      }
      if (previous.status !== run.status) {
        this.timeline.record("api", "run", `Run ${run.id} status ${previous.status} -> ${run.status}`, {
          runId: run.id,
          error: run.error ?? undefined,
        });
      }
      this.runs.set(run.id, run);
    }
  }

  private synthesizeWakeupsFromRuns(
    runs: HeartbeatRunRecord[],
    apiWakeups: WakeupRequestRecord[],
  ) {
    const apiWakeupIds = new Set(apiWakeups.map((wakeup) => wakeup.id));
    const seen = new Set<string>();
    const synthesized: WakeupRequestRecord[] = [];

    for (const run of runs) {
      const runCreatedAtMs = dateMs(run.createdAt);
      if (runCreatedAtMs !== null && runCreatedAtMs < this.timeline.startedAtMs) continue;
      const wakeup = wakeupFromRun(run);
      if (!wakeup) continue;
      if (apiWakeupIds.has(wakeup.id)) continue;
      if (seen.has(wakeup.id)) continue;
      seen.add(wakeup.id);
      synthesized.push(wakeup);
    }

    return synthesized;
  }

  private async captureWakeups(current: WakeupRequestRecord[]) {
    for (const wakeup of current) {
      const previous = this.wakeups.get(wakeup.id);
      if (!previous) {
        this.wakeups.set(wakeup.id, wakeup);
        this.timeline.record(
          "api",
          "wakeup",
          `Wakeup ${wakeup.id} created for agent ${wakeup.agentId} (${wakeup.status}, ${wakeup.reason ?? wakeup.source})`,
          { wakeupId: wakeup.id, issueId: this.wakeupIssueId(wakeup) ?? undefined },
        );
        continue;
      }
      if (previous.status !== wakeup.status) {
        this.timeline.record("api", "wakeup", `Wakeup ${wakeup.id} status ${previous.status} -> ${wakeup.status}`, {
          wakeupId: wakeup.id,
          error: wakeup.error ?? undefined,
        });
      }
      this.wakeups.set(wakeup.id, wakeup);
    }
  }
}

function defaultArtifactRoot(cwd = process.cwd()) {
  return path.resolve(cwd, "artifacts", "orchestration");
}

function parseArgs(argv: string[]): HarnessOptions {
  const options: HarnessOptions = {
    baseUrl: process.env.PAPERCLIP_BASE_URL?.trim() || "http://localhost:3100",
    childAgents: [],
    timeoutSec: 240,
    pollIntervalMs: 2000,
    artifactRoot: defaultArtifactRoot(),
    probeAllAgents: false,
    keepIssues: false,
    listScenarios: false,
  };

  for (let idx = 0; idx < argv.length; idx += 1) {
    const arg = argv[idx];
    if (arg === "--") continue;
    const next = argv[idx + 1];
    switch (arg) {
      case "--scenario":
        if (!next) {
          throw new Error("Expected --scenario <scenario-id>");
        }
        options.scenario = next as OrchestrationScenarioId;
        idx += 1;
        break;
      case "--suite":
        if (!next) {
          throw new Error("Expected --suite <suite-id>");
        }
        options.suite = next as OrchestrationSuiteId;
        idx += 1;
        break;
      case "--base-url":
        if (!next) throw new Error("Expected --base-url <url>");
        options.baseUrl = next;
        idx += 1;
        break;
      case "--company":
        if (!next) throw new Error("Expected --company <company-id>");
        options.companyId = next;
        idx += 1;
        break;
      case "--auth-header":
        if (!next) throw new Error("Expected --auth-header <value>");
        options.authHeader = next;
        idx += 1;
        break;
      case "--cookie":
        if (!next) throw new Error("Expected --cookie <value>");
        options.cookie = next;
        idx += 1;
        break;
      case "--agent":
        if (!next) throw new Error("Expected --agent <name-or-id>");
        options.agent = next;
        idx += 1;
        break;
      case "--parent-agent":
        if (!next) throw new Error("Expected --parent-agent <name-or-id>");
        options.parentAgent = next;
        idx += 1;
        break;
      case "--child-agent":
        if (!next) throw new Error("Expected --child-agent <name-or-id>");
        options.childAgent = next;
        idx += 1;
        break;
      case "--child-agents":
        if (!next) throw new Error("Expected --child-agents <name-or-id[,name-or-id...]>");
        options.childAgents.push(...splitCsv(next));
        idx += 1;
        break;
      case "--grandchild-agent":
        if (!next) throw new Error("Expected --grandchild-agent <name-or-id>");
        options.grandchildAgent = next;
        idx += 1;
        break;
      case "--email":
        if (!next) throw new Error("Expected --email <value>");
        options.email = next;
        idx += 1;
        break;
      case "--password":
        if (!next) throw new Error("Expected --password <value>");
        options.password = next;
        idx += 1;
        break;
      case "--timeout-sec":
        if (!next) throw new Error("Expected --timeout-sec <seconds>");
        options.timeoutSec = Math.max(30, Number.parseInt(next, 10) || 240);
        idx += 1;
        break;
      case "--poll-ms":
        if (!next) throw new Error("Expected --poll-ms <milliseconds>");
        options.pollIntervalMs = Math.max(250, Number.parseInt(next, 10) || 2000);
        idx += 1;
        break;
      case "--artifact-root":
        if (!next) throw new Error("Expected --artifact-root <path>");
        options.artifactRoot = path.resolve(next);
        idx += 1;
        break;
      case "--probe-all-agents":
        options.probeAllAgents = true;
        break;
      case "--keep-issues":
        options.keepIssues = true;
        break;
      case "--list":
      case "--list-scenarios":
        options.listScenarios = true;
        break;
      case "--help":
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  options.childAgents = uniqueStrings([
    ...options.childAgents,
    ...(options.childAgent ? [options.childAgent] : []),
  ]);

  return options;
}

function printHelp() {
  console.log(
    [
      "Paperclip orchestration harness",
      "",
      "Examples:",
      "  pnpm diag:orchestration -- --scenario health --agent ceo",
      "  pnpm diag:orchestration -- --scenario single-agent --agent alpha",
      "  pnpm diag:orchestration -- --scenario single-agent-blocked --agent alpha",
      "  pnpm diag:orchestration -- --scenario realwork-api --agent alpha",
      "  pnpm diag:orchestration -- --scenario delegation --parent-agent ceo --child-agent alpha",
      "  pnpm diag:orchestration -- --scenario delegation-failure --parent-agent ceo --child-agent alpha",
      "  pnpm diag:orchestration -- --scenario fan-out --parent-agent ceo --child-agents alpha,beta",
      "  PAPERCLIP_COOKIE='<session cookie>' pnpm diag:orchestration -- --suite foundation --agent alpha",
      "  pnpm diag:orchestration -- --suite full --agent alpha --parent-agent ceo --child-agent alpha --grandchild-agent beta --child-agents alpha,beta",
      "",
      "Options:",
      "  --scenario <scenario-id>",
      "  --suite <suite-id>",
      "  --auth-header <value>",
      "  --cookie <value>",
      "  --agent <name-or-id>",
      "  --parent-agent <name-or-id>",
      "  --child-agent <name-or-id>",
      "  --child-agents <a,b[,c]>",
      "  --grandchild-agent <name-or-id>",
      "  --company <company-id>",
      "  --base-url <url>",
      "  --email <board-email>",
      "  --password <board-password>",
      "  --timeout-sec <seconds>",
      "  --poll-ms <milliseconds>",
      "  --artifact-root <path>",
      "  --probe-all-agents",
      "  --keep-issues",
      "  --list",
      "",
      formatScenarioCatalog(),
    ].join("\n"),
  );
}

function resolveAgent(reference: string, agents: AgentRecord[]) {
  const needle = reference.trim().toLowerCase();
  const exact =
    agents.find((agent) => agent.id.toLowerCase() === needle) ??
    agents.find((agent) => agent.name.trim().toLowerCase() === needle) ??
    agents.find((agent) => agent.shortName?.trim().toLowerCase() === needle);
  if (exact) return exact;
  const prefixMatches = agents.filter(
    (agent) =>
      agent.name.trim().toLowerCase().startsWith(needle) ||
      (agent.shortName?.trim().toLowerCase().startsWith(needle) ?? false),
  );
  if (prefixMatches.length === 1) return prefixMatches[0] ?? null;
  if (prefixMatches.length > 1) {
    throw new Error(`Agent reference "${reference}" is ambiguous: ${prefixMatches.map((agent) => agent.name).join(", ")}`);
  }
  return null;
}

function resolveAgentList(references: string[], agents: AgentRecord[]) {
  const resolved: AgentRecord[] = [];
  const seen = new Set<string>();
  for (const reference of references) {
    const agent = resolveAgent(reference, agents);
    if (!agent) throw new Error(`Agent not found: ${reference}`);
    if (seen.has(agent.id)) continue;
    seen.add(agent.id);
    resolved.push(agent);
  }
  return resolved;
}

async function resolveCompany(client: ApiClient, requestedCompanyId?: string) {
  const companies = await client.listCompanies();
  if (companies.length === 0) {
    throw new Error(
      "No companies found for the authenticated board user. Authenticate with a board user connected to the target company via PAPERCLIP_COOKIE, PAPERCLIP_AUTH_HEADER, --cookie, or --auth-header.",
    );
  }
  if (!requestedCompanyId) return companies[0]!;
  const exact = companies.find((company) => company.id === requestedCompanyId);
  if (!exact) throw new Error(`Company not found: ${requestedCompanyId}`);
  return exact;
}

async function assertNoActiveRunsOrWakeups(
  client: ApiClient,
  companyId: string,
  timeline: Timeline,
) {
  const runs = await client.listRuns(companyId, 200);
  const wakeups = await client.listWakeups(companyId, {
    limit: 200,
    status: "queued,claimed,deferred_issue_execution",
  });
  const activeRuns = runs.filter((run) => run.status === "queued" || run.status === "running");
  if (activeRuns.length > 0) {
    throw new Error(`Expected zero active runs, found ${activeRuns.length}: ${activeRuns.map((run) => run.id).join(", ")}`);
  }
  if (wakeups.length > 0) {
    throw new Error(`Expected zero non-terminal wakeups, found ${wakeups.length}: ${wakeups.map((wakeup) => wakeup.id).join(", ")}`);
  } else {
    timeline.record("api", "health", "No active heartbeat runs or wakeup requests found");
  }
}

async function probeAgents(
  client: ApiClient,
  companyId: string,
  agents: AgentRecord[],
  timeline: Timeline,
) {
  for (const agent of agents) {
    const result = await client.testAdapterEnvironment(companyId, agent);
    timeline.record("api", "env", `Adapter probe for ${agent.name}: ${result.status}`);
    for (const check of result.checks) {
      timeline.record(
        "api",
        "env.check",
        `${agent.name} ${check.level} ${check.code}: ${excerpt(check.message, 180)}`,
      );
    }
    if (result.status === "fail") {
      throw new Error(`Adapter environment probe failed for ${agent.name}`);
    }
  }
}

interface RunArtifactBundle {
  events: RunEventRecord[];
  logContent: string;
}

function splitRunLogByStream(logContent: string) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  for (const line of logContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parsed = parseJson(trimmed);
    const record = parsed ? asRecord(parsed) : {};
    const chunk = asString(record.chunk);
    if (!chunk) continue;
    if (asString(record.stream) === "stderr") {
      stderr.push(chunk);
    } else {
      stdout.push(chunk);
    }
  }
  return { stdout: stdout.join(""), stderr: stderr.join("") };
}

async function fetchRunArtifacts(
  client: ApiClient,
  writer: ArtifactWriter,
  timeline: Timeline,
  runIds: string[],
) {
  const bundles = new Map<string, RunArtifactBundle>();
  for (const runId of runIds) {
    try {
      const events = await client.listRunEvents(runId);
      await writer.writeJson(path.join("runs", `${runId}.events.json`), events);
      let offset = 0;
      let content = "";
      for (;;) {
        const page = await client.readRunLog(runId, offset, 256_000);
        if (!page) break;
        if (page.content) content += page.content;
        if (page.nextOffset === undefined) break;
        offset = page.nextOffset;
      }
      await writer.writeText(path.join("runs", `${runId}.log.ndjson`), content);
      const split = splitRunLogByStream(content);
      await writer.writeText(path.join("runs", `${runId}.stdout.log`), split.stdout);
      await writer.writeText(path.join("runs", `${runId}.stderr.log`), split.stderr);
      bundles.set(runId, { events, logContent: content });
      timeline.record("api", "artifact", `Fetched run artifacts for ${runId}`);
    } catch (err) {
      timeline.record("api", "artifact", `Failed to fetch run artifacts for ${runId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return bundles;
}

function runArtifactsContainText(
  bundles: Map<string, RunArtifactBundle>,
  runIds: string[],
  predicate: (text: string) => boolean,
) {
  for (const runId of runIds) {
    const bundle = bundles.get(runId);
    if (!bundle) continue;
    if (predicate(bundle.logContent)) return true;
    const eventText = collectStringLeaves(bundle.events);
    if (eventText.some((text) => predicate(text))) return true;
  }
  return false;
}

function latestWakeupForAgent(
  wakeups: WakeupRequestRecord[],
  agentId: string,
  issueId?: string,
) {
  return wakeups
    .filter((wakeup) => wakeup.agentId === agentId)
    .filter((wakeup) => !issueId || readIssueIdFromPayload(wakeup.payload) === issueId)
    .sort((left, right) => (dateMs(right.requestedAt) ?? 0) - (dateMs(left.requestedAt) ?? 0))[0] ?? null;
}

function latestRunForAgent(runs: HeartbeatRunRecord[], agentId: string, issueId?: string) {
  return runs
    .filter((run) => run.agentId === agentId)
    .filter((run) => !issueId || readIssueIdFromPayload(run.contextSnapshot) === issueId)
    .sort((left, right) => (dateMs(right.startedAt ?? right.createdAt) ?? 0) - (dateMs(left.startedAt ?? left.createdAt) ?? 0))[0] ?? null;
}

export function wakeOrRunObservedAfter(
  thresholdMs: number,
  wakeup: WakeupRequestRecord | null | undefined,
  run: HeartbeatRunRecord | null | undefined,
) {
  const wakeAt = dateMs(wakeup?.requestedAt) ?? 0;
  if (wakeAt >= thresholdMs) return true;

  const runStart = dateMs(run?.startedAt ?? run?.createdAt) ?? 0;
  const runEnd = dateMs(run?.finishedAt ?? run?.startedAt ?? run?.createdAt) ?? 0;
  return runStart >= thresholdMs || (runStart > 0 && runEnd >= thresholdMs);
}

async function runHealthScenario(
  client: ApiClient,
  options: HarnessOptions,
  company: CompanyRecord,
  agents: AgentRecord[],
  timeline: Timeline,
  writer: ArtifactWriter,
) {
  const checkpoints: ScenarioCheckpoint[] = [];
  const health = await client.health();
  checkpoints.push({
    name: "api.health",
    passed: asString(asRecord(health).status) === "ok",
    detail: JSON.stringify(health),
  });
  timeline.record("api", "health", `Health endpoint returned ${JSON.stringify(health)}`);

  await assertNoActiveRunsOrWakeups(client, company.id, timeline);
  checkpoints.push({ name: "active-runs-clean", passed: true });

  if (options.agent) {
    const agent = resolveAgent(options.agent, agents);
    if (!agent) throw new Error(`Agent not found: ${options.agent}`);
    await probeAgents(client, company.id, [agent], timeline);
    checkpoints.push({ name: `env-probe:${agent.name}`, passed: true });
  } else if (options.probeAllAgents) {
    await probeAgents(client, company.id, agents, timeline);
    checkpoints.push({ name: "env-probe:all-agents", passed: true });
  }

  const summary: ScenarioSummary = {
    scenario: "health",
    success: checkpoints.every((checkpoint) => checkpoint.passed),
    tag: "health",
    startedAt: new Date(timeline.startedAtMs).toISOString(),
    finishedAt: nowIso(),
    companyId: company.id,
    companyName: company.name,
    checkpoints,
    issueIds: [],
    runIds: [],
    artifactDir: writer.baseDir,
  };
  await writer.writeJson("summary.json", summary);
  return summary;
}

async function waitForCondition(
  timeline: Timeline,
  timeoutSec: number,
  label: string,
  predicate: () => { done: boolean; detail?: string },
) {
  const deadline = Date.now() + timeoutSec * 1000;
  while (Date.now() < deadline) {
    if (stopRequestedBySignal) {
      timeline.record("diag", "signal", `Stopping wait for ${label} because ${stopRequestedBySignal} was received`);
      return predicate();
    }
    const result = predicate();
    if (result.done) return result;
    await sleep(1000);
  }
  const last = predicate();
  timeline.record("diag", "timeout", `${label} timed out${last.detail ? `: ${last.detail}` : ""}`);
  return last;
}

async function runSingleAgentIssueScenario(
  client: ApiClient,
  options: HarnessOptions,
  company: CompanyRecord,
  agents: AgentRecord[],
  timeline: Timeline,
  writer: ArtifactWriter,
  config: {
    scenarioId:
      | "single-agent"
      | "single-agent-blocked"
      | "realwork-read"
      | "realwork-write"
      | "realwork-api";
    setup?: (ctx: {
      tag: string;
      agent: AgentRecord;
      timeline: Timeline;
      writer: ArtifactWriter;
    }) => Promise<JsonRecord>;
    issueTitle: (ctx: { tag: string; agent: AgentRecord; setup: JsonRecord }) => string;
    issueDescription: (ctx: { tag: string; agent: AgentRecord; setup: JsonRecord }) => string;
    expectedIssueStatus: "closed" | "blocked";
    completionLabel: string;
    checkpointName: string;
    checkpointPredicate: (
      issue: IssueRecord | null,
      comments: IssueCommentRecord[],
      runs: HeartbeatRunRecord[],
      wakeups: WakeupRequestRecord[],
      agent: AgentRecord,
      setup: JsonRecord,
    ) => boolean;
    extraCheckpoints?: (ctx: {
      issue: IssueRecord | null;
      comments: IssueCommentRecord[];
      runs: HeartbeatRunRecord[];
      wakeups: WakeupRequestRecord[];
      runArtifacts: Map<string, RunArtifactBundle>;
      agent: AgentRecord;
      setup: JsonRecord;
    }) => Promise<ScenarioCheckpoint[]>;
  },
) {
  if (!options.agent) throw new Error("single-agent scenario requires --agent");
  const agent = resolveAgent(options.agent, agents);
  if (!agent) throw new Error(`Agent not found: ${options.agent}`);

  await assertNoActiveRunsOrWakeups(client, company.id, timeline);
  await probeAgents(client, company.id, [agent], timeline);

  const tag = `HARNESS-${Date.now()}`;
  const setup = (await config.setup?.({ tag, agent, timeline, writer })) ?? {};
  const cleanup = new CleanupManager();
  const observer = new ScenarioObserver(client, writer, timeline, company.id, tag, [agent], options.pollIntervalMs, cleanup);

  let summary: ScenarioSummary | null = null;
  await observer.start();
  try {
    const issue = await client.createIssue(company.id, {
      title: config.issueTitle({ tag, agent, setup }),
      description: config.issueDescription({ tag, agent, setup }),
      assigneeAgentId: agent.id,
      status: "draft",
    });
    cleanup.noteIssue(issue.id);
    observer.trackIssue(issue.id);
    timeline.record("api", "issue", `Created scenario issue ${issue.id} for ${agent.name}`);

    const checkpoints: ScenarioCheckpoint[] = [];
    const result = await waitForCondition(timeline, options.timeoutSec, config.completionLabel, () => {
      const observedIssue = observer.getIssue(issue.id);
      const comments = observer.commentsForIssue(issue.id);
      const runs = observer
        .runList()
        .filter((run) => run.agentId === agent.id && readIssueIdFromPayload(run.contextSnapshot) === issue.id);
      const wakeups = observer
        .wakeupList()
        .filter((wakeup) => wakeup.agentId === agent.id && readIssueIdFromPayload(wakeup.payload) === issue.id);
      return {
        done: config.checkpointPredicate(observedIssue, comments, runs, wakeups, agent, setup),
        detail: JSON.stringify({
          issueStatus: observedIssue?.status ?? null,
          commentCount: comments.length,
          runStatuses: runs.map((run) => run.status),
          wakeupStatuses: wakeups.map((wakeup) => wakeup.status),
          agentStatus: observer.getAgentStatus(agent.id),
        }),
      };
    });

    const observedIssue = observer.getIssue(issue.id);
    const comments = observer.commentsForIssue(issue.id);
    const runs = observer
      .runList()
      .filter((run) => run.agentId === agent.id && readIssueIdFromPayload(run.contextSnapshot) === issue.id);
    const wakeups = observer
      .wakeupList()
      .filter((wakeup) => wakeup.agentId === agent.id && readIssueIdFromPayload(wakeup.payload) === issue.id);
    checkpoints.push({ name: "issue-created", passed: true, detail: issue.id });
    checkpoints.push({ name: "wakeup-observed", passed: wakeups.length > 0, detail: wakeups.map((wakeup) => wakeup.id).join(", ") });
    checkpoints.push({ name: "run-created", passed: runs.length > 0, detail: runs.map((run) => run.id).join(", ") });
    checkpoints.push({
      name: "comment-posted",
      passed: comments.some((comment) => comment.authorAgentId === agent.id),
      detail: comments.map((comment) => comment.id).join(", "),
    });
    checkpoints.push({
      name: config.checkpointName,
      passed: observedIssue?.status === config.expectedIssueStatus,
      detail: observedIssue?.status ?? "missing",
    });
    checkpoints.push({
      name: "run-succeeded",
      passed: runs.some((run) => run.status === "succeeded"),
      detail: runs.map((run) => `${run.id}:${run.status}`).join(", "),
    });
    const runArtifacts = await fetchRunArtifacts(client, writer, timeline, cleanup.runIdList());
    if (config.extraCheckpoints) {
      checkpoints.push(
        ...(await config.extraCheckpoints({
          issue: observedIssue,
          comments,
          runs,
          wakeups,
          runArtifacts,
          agent,
          setup,
        })),
      );
    }

    summary = {
      scenario: config.scenarioId,
      success: result.done && checkpoints.every((checkpoint) => checkpoint.passed),
      tag,
      startedAt: new Date(timeline.startedAtMs).toISOString(),
      finishedAt: nowIso(),
      companyId: company.id,
      companyName: company.name,
      checkpoints,
      issueIds: cleanup.issueIdList(),
      runIds: cleanup.runIdList(),
      artifactDir: writer.baseDir,
    };
    await writer.writeJson("summary.json", summary);
  } finally {
    await observer.pollOnce();
    await observer.stop();
    await cleanup.cleanup(client, timeline, observer.issueList(), options.keepIssues);
  }

  if (!summary) throw new Error(`${config.scenarioId} scenario did not produce a summary`);
  return summary;
}

async function runSingleAgentScenario(
  client: ApiClient,
  options: HarnessOptions,
  company: CompanyRecord,
  agents: AgentRecord[],
  timeline: Timeline,
  writer: ArtifactWriter,
) {
  return runSingleAgentIssueScenario(client, options, company, agents, timeline, writer, {
    scenarioId: "single-agent",
    issueTitle: ({ tag, agent }) => `[${tag}] Single-agent hello for ${agent.name}`,
    issueDescription: ({ tag, agent }) =>
      [
        `Testing harness tag: ${tag}`,
        "Use the Paperclip skill or API available in your runtime.",
        `Post exactly one comment that says: Hello from ${agent.name}. Tag: ${tag}.`,
        "Then set this issue status to closed.",
        "Do not create child issues or do unrelated work.",
      ].join("\n"),
    expectedIssueStatus: "closed",
    completionLabel: "single-agent completion",
    checkpointName: "issue-done",
    checkpointPredicate: (issue, comments, runs, wakeups, agent) =>
      issue?.status === "closed" &&
      comments.some((comment) => comment.authorAgentId === agent.id) &&
      runs.some((run) => run.status === "succeeded") &&
      wakeups.length > 0,
  });
}

async function runSingleAgentBlockedScenario(
  client: ApiClient,
  options: HarnessOptions,
  company: CompanyRecord,
  agents: AgentRecord[],
  timeline: Timeline,
  writer: ArtifactWriter,
) {
  return runSingleAgentIssueScenario(client, options, company, agents, timeline, writer, {
    scenarioId: "single-agent-blocked",
    issueTitle: ({ tag, agent }) => `[${tag}] Single-agent blocker for ${agent.name}`,
    issueDescription: ({ tag }) =>
      [
        `Testing harness tag: ${tag}`,
        "Use the Paperclip skill or API available in your runtime.",
        "This task requires access to the fictional system Unobtainium, which is not available.",
        "Post one comment explaining the blocker and explicitly mention Unobtainium.",
        "Then set this issue status to blocked.",
        "Do not mark the issue closed and do not create child issues.",
      ].join("\n"),
    expectedIssueStatus: "blocked",
    completionLabel: "single-agent blocked completion",
    checkpointName: "issue-blocked",
    checkpointPredicate: (issue, comments, runs, wakeups, agent) =>
      issue?.status === "blocked" &&
      comments.some(
        (comment) =>
          comment.authorAgentId === agent.id &&
          /unobtainium/i.test(comment.body),
      ) &&
      runs.some((run) => run.status === "succeeded") &&
      wakeups.length > 0,
  });
}

async function runRealworkReadScenario(
  client: ApiClient,
  options: HarnessOptions,
  company: CompanyRecord,
  agents: AgentRecord[],
  timeline: Timeline,
  writer: ArtifactWriter,
) {
  return runSingleAgentIssueScenario(client, options, company, agents, timeline, writer, {
    scenarioId: "realwork-read",
    setup: async ({ tag, agent, timeline: setupTimeline, writer: scenarioWriter }) => {
      const workspaceDir = ensureAgentWorkspace(agent.id);
      const fixtureDir = path.join(workspaceDir, "harness", tag);
      const fixturePath = path.join(fixtureDir, "read-target.txt");
      const summaryLine = `summary: ${agent.name} can read the orchestration fixture.`;
      const checksumLine = `checksum: ${tag.slice(-6)}`;
      await mkdir(fixtureDir, { recursive: true });
      await writeFile(
        fixturePath,
        [
          `tag: ${tag}`,
          summaryLine,
          checksumLine,
          "instruction: echo the summary and checksum back in your comment.",
        ].join("\n"),
        "utf8",
      );
      await scenarioWriter.writeJson("workspace-setup.json", { workspaceDir, fixturePath });
      setupTimeline.record("diag", "setup", `Prepared read fixture ${fixturePath}`);
      return {
        workspaceDir,
        fixturePath,
        summaryLine,
        checksumLine,
      };
    },
    issueTitle: ({ tag, agent }) => `[${tag}] Real-work read for ${agent.name}`,
    issueDescription: ({ tag, setup }) =>
      [
        `Testing harness tag: ${tag}`,
        "Read the workspace file at the exact path below and use its contents in your comment.",
        `Target file: ${asString(setup.fixturePath)}`,
        `Post one comment that includes both exact lines: "${asString(setup.summaryLine)}" and "${asString(setup.checksumLine)}".`,
        "Then set this issue status to closed.",
        "Do not create child issues and do not modify the file.",
      ].join("\n"),
    expectedIssueStatus: "closed",
    completionLabel: "real-work read completion",
    checkpointName: "issue-done",
    checkpointPredicate: (issue, comments, runs, wakeups, agent, setup) =>
      issue?.status === "closed" &&
      comments.some(
        (comment) =>
          comment.authorAgentId === agent.id &&
          comment.body.includes(asString(setup.summaryLine) ?? "") &&
          comment.body.includes(asString(setup.checksumLine) ?? ""),
      ) &&
      runs.some((run) => run.status === "succeeded") &&
      wakeups.length > 0,
    extraCheckpoints: async ({ comments, agent, setup }) => {
      const fixturePath = asString(setup.fixturePath) ?? "";
      const fixtureText = fixturePath ? await readTextIfExists(fixturePath) : null;
      return [
        {
          name: "comment-reflects-file",
          passed: comments.some(
            (comment) =>
              comment.authorAgentId === agent.id &&
              comment.body.includes(asString(setup.summaryLine) ?? "") &&
              comment.body.includes(asString(setup.checksumLine) ?? ""),
          ),
          detail: comments.map((comment) => comment.id).join(", "),
        },
        {
          name: "fixture-preserved",
          passed:
            fixtureText !== null &&
            fixtureText.includes(asString(setup.summaryLine) ?? "") &&
            fixtureText.includes(asString(setup.checksumLine) ?? ""),
          detail: fixturePath || "missing",
        },
      ];
    },
  });
}

async function runRealworkWriteScenario(
  client: ApiClient,
  options: HarnessOptions,
  company: CompanyRecord,
  agents: AgentRecord[],
  timeline: Timeline,
  writer: ArtifactWriter,
) {
  return runSingleAgentIssueScenario(client, options, company, agents, timeline, writer, {
    scenarioId: "realwork-write",
    setup: async ({ tag, agent, timeline: setupTimeline, writer: scenarioWriter }) => {
      const workspaceDir = ensureAgentWorkspace(agent.id);
      const artifactDir = path.join(workspaceDir, "harness", tag);
      const artifactPath = path.join(artifactDir, "generated-artifact.md");
      await mkdir(artifactDir, { recursive: true });
      await rm(artifactPath, { force: true });
      await scenarioWriter.writeJson("workspace-setup.json", { workspaceDir, artifactPath });
      setupTimeline.record("diag", "setup", `Reserved artifact path ${artifactPath}`);
      return {
        workspaceDir,
        artifactPath,
        artifactHeader: `# Harness Artifact ${tag}`,
        artifactBody: `result: ${agent.name} wrote this file from the agent workspace`,
      };
    },
    issueTitle: ({ tag, agent }) => `[${tag}] Real-work write for ${agent.name}`,
    issueDescription: ({ tag, agent, setup }) =>
      [
        `Testing harness tag: ${tag}`,
        "Create a text artifact in your workspace at the exact path below.",
        `Artifact path: ${asString(setup.artifactPath)}`,
        `The file must contain the line "${asString(setup.artifactHeader)}".`,
        `The file must contain the line "${asString(setup.artifactBody)}".`,
        `After writing the file, post one comment that includes the exact path "${asString(setup.artifactPath)}" and the phrase "artifact-written".`,
        "Then set this issue status to closed.",
        "Do not create child issues.",
      ].join("\n"),
    expectedIssueStatus: "closed",
    completionLabel: "real-work write completion",
    checkpointName: "issue-done",
    checkpointPredicate: (issue, comments, runs, wakeups, agent, setup) =>
      issue?.status === "closed" &&
      comments.some(
        (comment) =>
          comment.authorAgentId === agent.id &&
          comment.body.includes(asString(setup.artifactPath) ?? "") &&
          /artifact-written/i.test(comment.body),
      ) &&
      runs.some((run) => run.status === "succeeded") &&
      wakeups.length > 0,
    extraCheckpoints: async ({ comments, agent, setup }) => {
      const artifactPath = asString(setup.artifactPath) ?? "";
      const artifactText = artifactPath ? await readTextIfExists(artifactPath) : null;
      return [
        {
          name: "artifact-file-created",
          passed: artifactPath.length > 0 && (await pathExists(artifactPath)),
          detail: artifactPath || "missing",
        },
        {
          name: "artifact-contents",
          passed:
            artifactText !== null &&
            artifactText.includes(asString(setup.artifactHeader) ?? "") &&
            artifactText.includes(asString(setup.artifactBody) ?? ""),
          detail: artifactPath || "missing",
        },
        {
          name: "comment-path",
          passed: comments.some(
            (comment) =>
              comment.authorAgentId === agent.id &&
              comment.body.includes(asString(setup.artifactPath) ?? ""),
          ),
          detail: comments.map((comment) => comment.id).join(", "),
        },
      ];
    },
  });
}

async function runRealworkApiScenario(
  client: ApiClient,
  options: HarnessOptions,
  company: CompanyRecord,
  agents: AgentRecord[],
  timeline: Timeline,
  writer: ArtifactWriter,
) {
  return runSingleAgentIssueScenario(client, options, company, agents, timeline, writer, {
    scenarioId: "realwork-api",
    setup: async ({ tag, writer: scenarioWriter }) => {
      const apiComment = `API confirmation for ${tag}`;
      await scenarioWriter.writeJson("workspace-setup.json", { apiComment });
      return { apiComment };
    },
    issueTitle: ({ tag, agent }) => `[${tag}] Real-work API for ${agent.name}`,
    issueDescription: ({ tag, setup }) =>
      [
        `Testing harness tag: ${tag}`,
        "Use the Paperclip HTTP API explicitly from your runtime. Do not rely only on automatic lifecycle handling.",
        "Use $PAPERCLIP_API_URL, $PAPERCLIP_API_KEY, $PAPERCLIP_RUN_ID, and $PAPERCLIP_TASK_ID.",
        `Post one issue comment through the API that contains exactly: "${asString(setup.apiComment)}".`,
        "Then transition the issue to closed through PATCH /api/issues/$PAPERCLIP_TASK_ID.",
        "Use curl or another explicit HTTP client so the run log shows the API call.",
        "Do not create child issues.",
      ].join("\n"),
    expectedIssueStatus: "closed",
    completionLabel: "real-work api completion",
    checkpointName: "issue-done",
    checkpointPredicate: (issue, comments, runs, wakeups, agent, setup) =>
      issue?.status === "closed" &&
      comments.some(
        (comment) =>
          comment.authorAgentId === agent.id &&
          comment.body.includes(asString(setup.apiComment) ?? ""),
      ) &&
      runs.some((run) => run.status === "succeeded") &&
      wakeups.length > 0,
    extraCheckpoints: async ({ comments, runs, runArtifacts, agent, setup }) => [
      {
        name: "api-comment-posted",
        passed: comments.some(
          (comment) =>
            comment.authorAgentId === agent.id &&
            comment.body.includes(asString(setup.apiComment) ?? ""),
        ),
        detail: comments.map((comment) => comment.id).join(", "),
      },
      {
        name: "api-evidence",
        passed: runArtifactsContainText(runArtifacts, runs.map((run) => run.id), (text) =>
          lineContainsAll(text, ["paperclip_api_url", "/api/issues/"]) &&
          (text.toLowerCase().includes("/comments") || text.toLowerCase().includes("patch")),
        ),
        detail: runs.map((run) => run.id).join(", "),
      },
    ],
  });
}

async function runDelegationScenario(
  client: ApiClient,
  options: HarnessOptions,
  company: CompanyRecord,
  agents: AgentRecord[],
  timeline: Timeline,
  writer: ArtifactWriter,
) {
  const parentRef = options.parentAgent ?? options.agent;
  const childRef = options.childAgent;
  if (!parentRef || !childRef) {
    throw new Error("delegation scenario requires --parent-agent and --child-agent");
  }
  const parentAgent = resolveAgent(parentRef, agents);
  const childAgent = resolveAgent(childRef, agents);
  if (!parentAgent) throw new Error(`Parent agent not found: ${parentRef}`);
  if (!childAgent) throw new Error(`Child agent not found: ${childRef}`);

  await assertNoActiveRunsOrWakeups(client, company.id, timeline);
  await probeAgents(client, company.id, [parentAgent, childAgent], timeline);

  const tag = `HARNESS-${Date.now()}`;
  const cleanup = new CleanupManager();
  const observer = new ScenarioObserver(
    client,
    writer,
    timeline,
    company.id,
    tag,
    [parentAgent, childAgent],
    options.pollIntervalMs,
    cleanup,
  );

  let summary: ScenarioSummary | null = null;
  await observer.start();
  try {
    const parentIssue = await client.createIssue(company.id, {
      title: `[${tag}] Delegation ${parentAgent.name} -> ${childAgent.name}`,
      description: [
        `Testing harness tag: ${tag}`,
        "Use the Paperclip skill or API available in your runtime.",
        `Create exactly one child issue with this exact title: [${tag}] ${childAgent.name}: confirm current date.`,
        `Assign that child issue to ${childAgent.name} (agent id: ${childAgent.id}).`,
        `The child issue description must instruct ${childAgent.name} to post a comment with today's date and then mark the child issue closed.`,
        "Wait for the child issue to complete.",
        "After the child is closed, post a summary comment on this parent issue that references the child's result and mark this parent issue closed.",
        "Do not create more than one child issue.",
      ].join("\n"),
      assigneeAgentId: parentAgent.id,
      status: "draft",
    });
    cleanup.noteIssue(parentIssue.id);
    observer.trackIssue(parentIssue.id);
    timeline.record("api", "issue", `Created delegation parent issue ${parentIssue.id}`);

    const checkpoints: ScenarioCheckpoint[] = [];
    const result = await waitForCondition(timeline, options.timeoutSec, "delegation completion", () => {
      const parent = observer.getIssue(parentIssue.id);
      const childIssues = observer.issueList().filter((issue) => issue.parentId === parentIssue.id);
      const childIssueIds = new Set(childIssues.map((issue) => issue.id));
      const childDone = childIssues.some((issue) => issue.status === "closed");
      const parentComments = observer.commentsForIssue(parentIssue.id);
      const childComments = childIssues.flatMap((issue) => observer.commentsForIssue(issue.id));
      const parentRuns = observer
        .runList()
        .filter((run) => run.agentId === parentAgent.id && readIssueIdFromPayload(run.contextSnapshot) === parentIssue.id);
      const childRuns = observer
        .runList()
        .filter((run) => run.agentId === childAgent.id)
        .filter((run) => {
          const issueId = readIssueIdFromPayload(run.contextSnapshot);
          return issueId ? childIssueIds.has(issueId) : false;
        });
      return {
        done:
          childIssues.length >= 1 &&
          childDone &&
          parent?.status === "closed" &&
          parentComments.some((comment) => comment.authorAgentId === parentAgent.id) &&
          childComments.some((comment) => comment.authorAgentId === childAgent.id) &&
          parentRuns.length > 0 &&
          childRuns.length > 0,
        detail: JSON.stringify({
          parentStatus: parent?.status ?? null,
          childIssues: childIssues.map((issue) => ({ id: issue.id, status: issue.status, assigneeAgentId: issue.assigneeAgentId })),
          parentRuns: parentRuns.map((run) => ({ id: run.id, status: run.status })),
          childRuns: childRuns.map((run) => ({ id: run.id, status: run.status })),
        }),
      };
    });

    const parent = observer.getIssue(parentIssue.id);
    const childIssues = observer.issueList().filter((issue) => issue.parentId === parentIssue.id);
    const childIssueIds = new Set(childIssues.map((issue) => issue.id));
    const parentComments = observer.commentsForIssue(parentIssue.id);
    const childComments = childIssues.flatMap((issue) => observer.commentsForIssue(issue.id));
    const parentRuns = observer
      .runList()
      .filter((run) => run.agentId === parentAgent.id && readIssueIdFromPayload(run.contextSnapshot) === parentIssue.id);
    const childRuns = observer
      .runList()
      .filter((run) => run.agentId === childAgent.id)
      .filter((run) => {
        const issueId = readIssueIdFromPayload(run.contextSnapshot);
        return issueId ? childIssueIds.has(issueId) : false;
      });
    const wakeups = observer.wakeupList();
    checkpoints.push({ name: "parent-issue-created", passed: true, detail: parentIssue.id });
    checkpoints.push({
      name: "child-issue-created",
      passed: childIssues.length >= 1,
      detail: childIssues.map((issue) => issue.id).join(", "),
    });
    checkpoints.push({
      name: "child-assigned",
      passed: childIssues.some((issue) => issue.assigneeAgentId === childAgent.id),
      detail: childIssues.map((issue) => `${issue.id}:${issue.assigneeAgentId ?? "none"}`).join(", "),
    });
    checkpoints.push({
      name: "child-done",
      passed: childIssues.some((issue) => issue.status === "closed"),
      detail: childIssues.map((issue) => `${issue.id}:${issue.status}`).join(", "),
    });
    checkpoints.push({
      name: "parent-done",
      passed: parent?.status === "closed",
      detail: parent?.status ?? "missing",
    });
    checkpoints.push({
      name: "parent-comment",
      passed: parentComments.some((comment) => comment.authorAgentId === parentAgent.id),
      detail: parentComments.map((comment) => comment.id).join(", "),
    });
    checkpoints.push({
      name: "child-comment",
      passed: childComments.some((comment) => comment.authorAgentId === childAgent.id),
      detail: childComments.map((comment) => comment.id).join(", "),
    });
    checkpoints.push({
      name: "parent-run",
      passed: parentRuns.length > 0,
      detail: parentRuns.map((run) => `${run.id}:${run.status}`).join(", "),
    });
    checkpoints.push({
      name: "child-run",
      passed: childRuns.length > 0,
      detail: childRuns.map((run) => `${run.id}:${run.status}`).join(", "),
    });
    checkpoints.push({
      name: "wakeup-chain",
      passed:
        wakeups.some((wakeup) => wakeup.agentId === parentAgent.id) &&
        wakeups.some((wakeup) => wakeup.agentId === childAgent.id),
      detail: wakeups.map((wakeup) => `${wakeup.id}:${wakeup.agentId}:${wakeup.status}`).join(", "),
    });

    summary = {
      scenario: "delegation",
      success: result.done && checkpoints.every((checkpoint) => checkpoint.passed),
      tag,
      startedAt: new Date(timeline.startedAtMs).toISOString(),
      finishedAt: nowIso(),
      companyId: company.id,
      companyName: company.name,
      checkpoints,
      issueIds: cleanup.issueIdList(),
      runIds: cleanup.runIdList(),
      artifactDir: writer.baseDir,
    };
    await fetchRunArtifacts(client, writer, timeline, cleanup.runIdList());
    await writer.writeJson("summary.json", summary);
  } finally {
    await observer.pollOnce();
    await observer.stop();
    await cleanup.cleanup(client, timeline, observer.issueList(), options.keepIssues);
  }

  if (!summary) throw new Error("Delegation scenario did not produce a summary");
  return summary;
}

async function runDelegationFailureScenario(
  client: ApiClient,
  options: HarnessOptions,
  company: CompanyRecord,
  agents: AgentRecord[],
  timeline: Timeline,
  writer: ArtifactWriter,
) {
  const parentRef = options.parentAgent ?? options.agent;
  const childRef = options.childAgent;
  if (!parentRef || !childRef) {
    throw new Error("delegation-failure scenario requires --parent-agent and --child-agent");
  }
  const parentAgent = resolveAgent(parentRef, agents);
  const childAgent = resolveAgent(childRef, agents);
  if (!parentAgent) throw new Error(`Parent agent not found: ${parentRef}`);
  if (!childAgent) throw new Error(`Child agent not found: ${childRef}`);
  if (parentAgent.id === childAgent.id) {
    throw new Error("delegation-failure scenario requires distinct parent and child agents");
  }

  await assertNoActiveRunsOrWakeups(client, company.id, timeline);
  await probeAgents(client, company.id, [parentAgent, childAgent], timeline);

  const tag = `HARNESS-${Date.now()}`;
  const recoveryReason = `permission denied while accessing restricted resource (${tag})`;
  const runFailureMarkerPrefix = "paperclip:auto_run_failure:";
  const parentFailureMarkerPrefix = "paperclip:auto_parent_failure:";
  const cleanup = new CleanupManager();
  const observer = new ScenarioObserver(
    client,
    writer,
    timeline,
    company.id,
    tag,
    [parentAgent, childAgent],
    options.pollIntervalMs,
    cleanup,
  );

  let summary: ScenarioSummary | null = null;
  await observer.start();
  try {
    const parentIssue = await client.createIssue(company.id, {
      title: `[${tag}] Delegation failure ${parentAgent.name} <- ${childAgent.name}`,
      description: [
        `Testing harness tag: ${tag}`,
        "Platform failure propagation diagnostics scenario.",
        "Do not manually resolve this issue; orchestration callbacks are validated by the harness.",
      ].join("\n"),
      assigneeAgentId: parentAgent.id,
      status: "draft",
    });
    cleanup.noteIssue(parentIssue.id);
    observer.trackIssue(parentIssue.id);
    timeline.record("api", "issue", `Created delegation-failure parent issue ${parentIssue.id}`);

    const parentCancelDeadline = Date.now() + 15_000;
    while (Date.now() < parentCancelDeadline) {
      await observer.pollOnce();
      const activeParentRuns = observer
        .runList()
        .filter((run) => run.agentId === parentAgent.id && readIssueIdFromPayload(run.contextSnapshot) === parentIssue.id)
        .filter((run) => run.status === "queued" || run.status === "running");
      if (activeParentRuns.length === 0) break;
      for (const run of activeParentRuns) {
        await client.cancelRun(run.id);
        timeline.record("api", "run", `Cancelled parent setup run ${run.id}`);
      }
      await sleep(500);
    }

    const childIssue = await client.createIssue(company.id, {
      title: `[${tag}] ${childAgent.name}: restricted operation`,
      description: [
        `Testing harness tag: ${tag}`,
        "This child issue is expected to fail via harness-invoked manual recovery.",
        "The scenario validates auto-block + parent callback propagation.",
      ].join("\n"),
      assigneeAgentId: childAgent.id,
      parentId: parentIssue.id,
      status: "draft",
    });
    cleanup.noteIssue(childIssue.id);
    observer.trackIssue(childIssue.id);
    timeline.record("api", "issue", `Created delegation-failure child issue ${childIssue.id}`);

    const activationResult = await waitForCondition(
      timeline,
      options.timeoutSec,
      "delegation-failure child run activation",
      () => {
        const childRuns = observer
          .runList()
          .filter((run) => run.agentId === childAgent.id && readIssueIdFromPayload(run.contextSnapshot) === childIssue.id);
        const active = childRuns.find((run) => run.status === "running") ?? childRuns.find((run) => run.status === "queued");
        return {
          done: Boolean(active),
          detail: childRuns.map((run) => `${run.id}:${run.status}`).join(", "),
        };
      },
    );
    if (!activationResult.done) {
      throw new Error("delegation-failure scenario could not observe an active child run");
    }

    let recoveredRunId: string | null = null;
    for (let attempt = 1; attempt <= 3 && !recoveredRunId; attempt += 1) {
      await observer.pollOnce();
      const activeChildRun = observer
        .runList()
        .filter((run) => run.agentId === childAgent.id && readIssueIdFromPayload(run.contextSnapshot) === childIssue.id)
        .find((run) => run.status === "running")
        ?? observer
            .runList()
            .filter((run) => run.agentId === childAgent.id && readIssueIdFromPayload(run.contextSnapshot) === childIssue.id)
            .find((run) => run.status === "queued")
        ?? null;

      if (!activeChildRun) {
        timeline.record("diag", "recovery", `No active child run found for manual recovery attempt ${attempt}`);
        await sleep(750);
        continue;
      }

      const recovered = await client.manualRecoverRuns(company.id, {
        runIds: [activeChildRun.id],
        reason: recoveryReason,
      });
      if (recovered.recoveredCount > 0) {
        recoveredRunId = recovered.runIds[0] ?? activeChildRun.id;
        timeline.record(
          "api",
          "recovery",
          `Manual recovery forced child run failure for ${recoveredRunId}`,
          {
            recoveredCount: recovered.recoveredCount,
          },
        );
        break;
      }

      timeline.record(
        "api",
        "recovery",
        `Manual recovery attempt ${attempt} did not recover a run; retrying`,
      );
      await sleep(750);
    }

    if (!recoveredRunId) {
      throw new Error("delegation-failure scenario could not force child run failure");
    }

    const checkpoints: ScenarioCheckpoint[] = [];
    const result = await waitForCondition(timeline, options.timeoutSec, "delegation-failure propagation", () => {
      const child = observer.getIssue(childIssue.id);
      const childComments = observer.commentsForIssue(childIssue.id);
      const parentComments = observer.commentsForIssue(parentIssue.id);
      const parentWakeups = observer
        .wakeupList()
        .filter((wakeup) => wakeup.agentId === parentAgent.id && readIssueIdFromPayload(wakeup.payload) === parentIssue.id);
      const parentRuns = observer
        .runList()
        .filter((run) => run.agentId === parentAgent.id && readIssueIdFromPayload(run.contextSnapshot) === parentIssue.id);
      const childFailureCommentSeen = childComments.some((comment) =>
        comment.body.includes(`${runFailureMarkerPrefix}${recoveredRunId}`),
      );
      const parentFailureCommentSeen = parentComments.some((comment) =>
        comment.body.includes(`${parentFailureMarkerPrefix}${recoveredRunId}`),
      );
      const parentWakeReasonSeen = parentWakeups.some((wakeup) => wakeup.reason === "child_issue_blocked");
      const parentRunContextSeen = parentRuns.some((run) => {
        const context = asRecord(run.contextSnapshot);
        return asString(context.wakeReason) === "child_issue_blocked";
      });
      return {
        done:
          child?.status === "blocked" &&
          childFailureCommentSeen &&
          parentFailureCommentSeen &&
          (parentWakeReasonSeen || parentRunContextSeen),
        detail: JSON.stringify({
          childStatus: child?.status ?? null,
          childFailureCommentSeen,
          parentFailureCommentSeen,
          parentWakeReasons: parentWakeups.map((wakeup) => wakeup.reason),
          parentRunWakeReasons: parentRuns.map((run) => asString(asRecord(run.contextSnapshot).wakeReason)),
        }),
      };
    });

    const child = observer.getIssue(childIssue.id);
    const parent = observer.getIssue(parentIssue.id);
    const childComments = observer.commentsForIssue(childIssue.id);
    const parentComments = observer.commentsForIssue(parentIssue.id);
    const childRuns = observer
      .runList()
      .filter((run) => run.agentId === childAgent.id && readIssueIdFromPayload(run.contextSnapshot) === childIssue.id);
    const parentRuns = observer
      .runList()
      .filter((run) => run.agentId === parentAgent.id && readIssueIdFromPayload(run.contextSnapshot) === parentIssue.id);
    const parentWakeups = observer
      .wakeupList()
      .filter((wakeup) => wakeup.agentId === parentAgent.id && readIssueIdFromPayload(wakeup.payload) === parentIssue.id);
    const recoveredChildRun = childRuns.find((run) => run.id === recoveredRunId) ?? null;
    const childFailureCommentSeen = childComments.some((comment) =>
      comment.body.includes(`${runFailureMarkerPrefix}${recoveredRunId}`),
    );
    const parentFailureCommentSeen = parentComments.some((comment) =>
      comment.body.includes(`${parentFailureMarkerPrefix}${recoveredRunId}`),
    );
    const escalationGuidanceSeen =
      childComments.some((comment) => comment.body.includes("request_permission_escalation")) ||
      parentComments.some((comment) => comment.body.includes("request_permission_escalation"));
    const parentWakeReasonSeen = parentWakeups.some((wakeup) => wakeup.reason === "child_issue_blocked");
    const parentWakePayloadSeen = parentWakeups.some((wakeup) => {
      const payload = asRecord(wakeup.payload);
      const childFailure = asRecord(payload.childFailure);
      return asString(payload.childIssueId) === childIssue.id && asString(childFailure.runId) === recoveredRunId;
    });
    const parentRunContextSeen = parentRuns.some((run) => {
      const context = asRecord(run.contextSnapshot);
      return asString(context.wakeReason) === "child_issue_blocked";
    });
    let escalationApprovalId: string | null = null;
    let escalationApprovalCreated = false;
    let escalationApprovalLinked = false;
    try {
      const approval = await client.createApproval(company.id, {
        type: "request_permission_escalation",
        requestedByAgentId: parentAgent.id,
        payload: {
          scenario: "delegation-failure",
          tag,
          childIssueId: childIssue.id,
          parentIssueId: parentIssue.id,
          runId: recoveredRunId,
        },
        issueIds: [childIssue.id, parentIssue.id],
      });
      escalationApprovalId = approval.id;
      escalationApprovalCreated =
        approval.type === "request_permission_escalation" &&
        approval.status === "pending" &&
        approval.requestedByAgentId === parentAgent.id;
      timeline.record("api", "approval", `Created escalation approval ${approval.id}`);

      const linkedIssues = await client.listApprovalIssues(approval.id);
      const linkedIssueIds = new Set(linkedIssues.map((issue) => issue.id));
      escalationApprovalLinked =
        linkedIssueIds.has(childIssue.id) &&
        linkedIssueIds.has(parentIssue.id);
      timeline.record(
        "api",
        "approval",
        `Escalation approval ${approval.id} linked to ${linkedIssues.length} issue(s)`,
      );

      await client.cancelApproval(approval.id, "orchestration harness cleanup");
      timeline.record("api", "approval", `Cancelled escalation approval ${approval.id} for cleanup`);
    } catch (err) {
      timeline.record(
        "api",
        "approval",
        `Escalation approval flow failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    checkpoints.push({ name: "parent-issue-created", passed: true, detail: parentIssue.id });
    checkpoints.push({ name: "child-issue-created", passed: true, detail: childIssue.id });
    checkpoints.push({
      name: "child-run-failed",
      passed: recoveredChildRun?.status === "failed" && recoveredChildRun.errorCode === "manual_recovery",
      detail: recoveredChildRun ? `${recoveredChildRun.id}:${recoveredChildRun.status}:${recoveredChildRun.errorCode ?? "none"}` : "missing",
    });
    checkpoints.push({
      name: "child-auto-blocked",
      passed: child?.status === "blocked",
      detail: child?.status ?? "missing",
    });
    checkpoints.push({
      name: "child-failure-comment",
      passed: childFailureCommentSeen,
      detail: childComments.map((comment) => comment.id).join(", "),
    });
    checkpoints.push({
      name: "parent-failure-brief",
      passed: parentFailureCommentSeen,
      detail: parentComments.map((comment) => comment.id).join(", "),
    });
    checkpoints.push({
      name: "parent-wake-child-blocked",
      passed: parentWakeReasonSeen || parentRunContextSeen,
      detail: `wakeReasons=${parentWakeups.map((wakeup) => wakeup.reason ?? "none").join(",")} runWakeReasons=${parentRuns.map((run) => asString(asRecord(run.contextSnapshot).wakeReason) ?? "none").join(",")}`,
    });
    checkpoints.push({
      name: "parent-wake-payload",
      passed: parentWakePayloadSeen || parentRunContextSeen,
      detail: parentWakeups.map((wakeup) => wakeup.id).join(", "),
    });
    checkpoints.push({
      name: "escalation-guidance-surfaced",
      passed: escalationGuidanceSeen,
      detail: "request_permission_escalation",
    });
    checkpoints.push({
      name: "escalation-approval-created",
      passed: escalationApprovalCreated,
      detail: escalationApprovalId ?? "missing",
    });
    checkpoints.push({
      name: "escalation-approval-linked",
      passed: escalationApprovalLinked,
      detail: escalationApprovalId ?? "missing",
    });
    checkpoints.push({
      name: "parent-still-open",
      passed: parent?.status !== "closed" && parent?.status !== "cancelled",
      detail: parent?.status ?? "missing",
    });

    summary = {
      scenario: "delegation-failure",
      success: result.done && checkpoints.every((checkpoint) => checkpoint.passed),
      tag,
      startedAt: new Date(timeline.startedAtMs).toISOString(),
      finishedAt: nowIso(),
      companyId: company.id,
      companyName: company.name,
      checkpoints,
      issueIds: cleanup.issueIdList(),
      runIds: cleanup.runIdList(),
      artifactDir: writer.baseDir,
    };
    await fetchRunArtifacts(client, writer, timeline, cleanup.runIdList());
    await writer.writeJson("summary.json", summary);
  } finally {
    await observer.pollOnce();
    await observer.stop();
    await cleanup.cleanup(client, timeline, observer.issueList(), options.keepIssues);
  }

  if (!summary) throw new Error("delegation-failure scenario did not produce a summary");
  return summary;
}

async function runFanOutScenario(
  client: ApiClient,
  options: HarnessOptions,
  company: CompanyRecord,
  agents: AgentRecord[],
  timeline: Timeline,
  writer: ArtifactWriter,
) {
  const parentRef = options.parentAgent ?? options.agent;
  if (!parentRef) throw new Error("fan-out scenario requires --parent-agent");
  const parentAgent = resolveAgent(parentRef, agents);
  if (!parentAgent) throw new Error(`Parent agent not found: ${parentRef}`);
  const childAgents = resolveAgentList(options.childAgents, agents).filter((agent) => agent.id !== parentAgent.id);
  if (childAgents.length < 2 || childAgents.length > 3) {
    throw new Error("fan-out scenario requires 2 or 3 distinct child agents via --child-agents");
  }

  await assertNoActiveRunsOrWakeups(client, company.id, timeline);
  await probeAgents(client, company.id, [parentAgent, ...childAgents], timeline);

  const tag = `HARNESS-${Date.now()}`;
  const childSpecs = childAgents.map((agent, idx) => ({
    agent,
    title: `[${tag}] Fan-out ${idx + 1} for ${agent.name}`,
    token: `fanout-${idx + 1}-${tag.slice(-6)}`,
  }));
  const cleanup = new CleanupManager();
  const observer = new ScenarioObserver(
    client,
    writer,
    timeline,
    company.id,
    tag,
    [parentAgent, ...childAgents],
    options.pollIntervalMs,
    cleanup,
  );
  const agentsById = new Map(agents.map((agent) => [agent.id, agent]));

  let summary: ScenarioSummary | null = null;
  await observer.start();
  try {
    const parentIssue = await client.createIssue(company.id, {
      title: `[${tag}] Fan-out ${parentAgent.name}`,
      description: [
        `Testing harness tag: ${tag}`,
        "Use the Paperclip skill or API available in your runtime.",
        `Create exactly ${childSpecs.length} child issues under this parent, one per requested assignee.`,
        ...childSpecs.flatMap((spec) => [
          `Child title: ${spec.title}`,
          `Assign that child to ${spec.agent.name} (agent id: ${spec.agent.id}).`,
          `The child description must instruct ${spec.agent.name} to post a comment that includes the exact token "${spec.token}" and then mark the child issue closed.`,
        ]),
        "Wait for every child issue to complete.",
        "After all children are closed, post one summary comment on this parent issue that mentions every child assignee name and every token.",
        "Then mark this parent issue closed.",
        "Do not create extra child issues.",
      ].join("\n"),
      assigneeAgentId: parentAgent.id,
      status: "draft",
    });
    cleanup.noteIssue(parentIssue.id);
    observer.trackIssue(parentIssue.id);
    timeline.record("api", "issue", `Created fan-out parent issue ${parentIssue.id}`);

    const checkpoints: ScenarioCheckpoint[] = [];
    const result = await waitForCondition(timeline, options.timeoutSec, "fan-out completion", () => {
      const parent = observer.getIssue(parentIssue.id);
      const childIssues = observer.issueList().filter((issue) => issue.parentId === parentIssue.id);
      const childIds = new Set(childIssues.map((issue) => issue.id));
      const parentComments = observer.commentsForIssue(parentIssue.id);
      const childComments = childIssues.flatMap((issue) => observer.commentsForIssue(issue.id));
      const parentRuns = observer
        .runList()
        .filter((run) => run.agentId === parentAgent.id && readIssueIdFromPayload(run.contextSnapshot) === parentIssue.id);
      const childRuns = observer
        .runList()
        .filter((run) => childAgents.some((agent) => agent.id === run.agentId))
        .filter((run) => {
          const issueId = readIssueIdFromPayload(run.contextSnapshot);
          return issueId ? childIds.has(issueId) : false;
        });
      const requestedAssigneeIds = new Set(childAgents.map((agent) => agent.id));
      const completeAssigneeIds = new Set(
        childIssues.filter((issue) => issue.status === "closed").map((issue) => issue.assigneeAgentId).filter(Boolean),
      );
      const overlapPair = findOverlapPair(childRuns);
      return {
        done:
          childIssues.length >= childAgents.length &&
          [...requestedAssigneeIds].every((agentId) => completeAssigneeIds.has(agentId)) &&
          parent?.status === "closed" &&
          parentComments.some(
            (comment) =>
              comment.authorAgentId === parentAgent.id &&
              childSpecs.every(
                (spec) =>
                  comment.body.toLowerCase().includes(spec.agent.name.toLowerCase()) &&
                  comment.body.includes(spec.token),
              ),
          ) &&
          childComments.some((comment) => comment.authorAgentId !== null) &&
          parentRuns.length >= 2 &&
          overlapPair !== null,
        detail: JSON.stringify({
          parentStatus: parent?.status ?? null,
          childIssues: childIssues.map((issue) => ({
            id: issue.id,
            status: issue.status,
            assigneeAgentId: issue.assigneeAgentId,
          })),
          parentRunCount: parentRuns.length,
          childRunIds: childRuns.map((run) => run.id),
          overlapPair: overlapPair ? overlapPair.map((run) => run.id) : null,
        }),
      };
    });

    const parent = observer.getIssue(parentIssue.id);
    const childIssues = observer.issueList().filter((issue) => issue.parentId === parentIssue.id);
    const childIssueIds = new Set(childIssues.map((issue) => issue.id));
    const parentComments = observer.commentsForIssue(parentIssue.id);
    const childComments = childIssues.flatMap((issue) => observer.commentsForIssue(issue.id));
    const parentRuns = observer
      .runList()
      .filter((run) => run.agentId === parentAgent.id && readIssueIdFromPayload(run.contextSnapshot) === parentIssue.id);
    const childRuns = observer
      .runList()
      .filter((run) => childAgents.some((agent) => agent.id === run.agentId))
      .filter((run) => {
        const issueId = readIssueIdFromPayload(run.contextSnapshot);
        return issueId ? childIssueIds.has(issueId) : false;
      });
    const wakeups = observer.wakeupList();
    const requestedAssigneeIds = childAgents.map((agent) => agent.id);
    const distinctAssigneeIds = uniqueStrings(
      childIssues.map((issue) => issue.assigneeAgentId ?? "").filter((value) => value.length > 0),
    );
    const childrenDoneAt = Math.max(
      ...childIssues.map((issue) => observer.issueTerminalTransitionAt(issue.id) ?? dateMs(issue.updatedAt) ?? 0),
      0,
    );
    const latestParentWake = latestWakeupForAgent(wakeups, parentAgent.id, parentIssue.id);
    const latestParentRun = latestRunForAgent(observer.runList(), parentAgent.id, parentIssue.id);
    const overlapPair = findOverlapPair(childRuns);

    checkpoints.push({ name: "parent-issue-created", passed: true, detail: parentIssue.id });
    checkpoints.push({
      name: "child-issues-created",
      passed: childIssues.length === childAgents.length,
      detail: childIssues.map((issue) => `${issue.id}:${issueAssigneeName(issue, agentsById)}`).join(", "),
    });
    checkpoints.push({
      name: "children-assigned-distinct",
      passed:
        distinctAssigneeIds.length === childAgents.length &&
        requestedAssigneeIds.every((agentId) => distinctAssigneeIds.includes(agentId)),
      detail: childIssues.map((issue) => `${issue.id}:${issue.assigneeAgentId ?? "none"}`).join(", "),
    });
    checkpoints.push({
      name: "children-done",
      passed: requestedAssigneeIds.every((agentId) => childIssues.some((issue) => issue.assigneeAgentId === agentId && issue.status === "closed")),
      detail: childIssues.map((issue) => `${issue.id}:${issue.status}`).join(", "),
    });
    checkpoints.push({
      name: "child-comments",
      passed: childSpecs.every(
        (spec) =>
          childIssues.some(
            (issue) =>
              issue.assigneeAgentId === spec.agent.id &&
              observer.commentsForIssue(issue.id).some(
                (comment) => comment.authorAgentId === spec.agent.id && comment.body.includes(spec.token),
              ),
          ),
      ),
      detail: childComments.map((comment) => comment.id).join(", "),
    });
    checkpoints.push({
      name: "child-runs-overlap",
      passed: overlapPair !== null,
      detail: overlapPair ? overlapPair.map((run) => `${run.id}:${run.agentId}`).join(", ") : "none",
    });
    checkpoints.push({
      name: "parent-woke-after-children",
      passed:
        parentRuns.length >= 2 &&
        wakeOrRunObservedAfter(childrenDoneAt, latestParentWake, latestParentRun),
      detail: `childrenDoneAt=${new Date(childrenDoneAt || 0).toISOString()} latestWake=${latestParentWake?.requestedAt ?? "none"} latestRun=${latestParentRun?.startedAt ?? latestParentRun?.createdAt ?? "none"}`,
    });
    checkpoints.push({
      name: "parent-summary-references-children",
      passed: parentComments.some(
        (comment) =>
          comment.authorAgentId === parentAgent.id &&
          childSpecs.every(
            (spec) =>
              comment.body.toLowerCase().includes(spec.agent.name.toLowerCase()) &&
              comment.body.includes(spec.token),
          ),
      ),
      detail: parentComments.map((comment) => comment.id).join(", "),
    });
    checkpoints.push({
      name: "parent-done",
      passed: parent?.status === "closed",
      detail: parent?.status ?? "missing",
    });
    checkpoints.push({
      name: "wakeup-chain",
      passed:
        wakeups.some((wakeup) => wakeup.agentId === parentAgent.id && readIssueIdFromPayload(wakeup.payload) === parentIssue.id) &&
        childAgents.every((agent) => wakeups.some((wakeup) => wakeup.agentId === agent.id)),
      detail: wakeups.map((wakeup) => `${wakeup.id}:${wakeup.agentId}:${wakeup.status}`).join(", "),
    });

    summary = {
      scenario: "fan-out",
      success: result.done && checkpoints.every((checkpoint) => checkpoint.passed),
      tag,
      startedAt: new Date(timeline.startedAtMs).toISOString(),
      finishedAt: nowIso(),
      companyId: company.id,
      companyName: company.name,
      checkpoints,
      issueIds: cleanup.issueIdList(),
      runIds: cleanup.runIdList(),
      artifactDir: writer.baseDir,
    };
    await fetchRunArtifacts(client, writer, timeline, cleanup.runIdList());
    await writer.writeJson("summary.json", summary);
  } finally {
    await observer.pollOnce();
    await observer.stop();
    await cleanup.cleanup(client, timeline, observer.issueList(), options.keepIssues);
  }

  if (!summary) throw new Error("Fan-out scenario did not produce a summary");
  return summary;
}

async function runMultiLevelDelegationScenario(
  client: ApiClient,
  options: HarnessOptions,
  company: CompanyRecord,
  agents: AgentRecord[],
  timeline: Timeline,
  writer: ArtifactWriter,
) {
  const parentRef = options.parentAgent ?? options.agent;
  const childRef = options.childAgent ?? options.childAgents[0];
  const grandchildRef = options.grandchildAgent;
  if (!parentRef || !childRef || !grandchildRef) {
    throw new Error("multi-level-delegation scenario requires --parent-agent, --child-agent, and --grandchild-agent");
  }
  const parentAgent = resolveAgent(parentRef, agents);
  const childAgent = resolveAgent(childRef, agents);
  const grandchildAgent = resolveAgent(grandchildRef, agents);
  if (!parentAgent) throw new Error(`Parent agent not found: ${parentRef}`);
  if (!childAgent) throw new Error(`Child agent not found: ${childRef}`);
  if (!grandchildAgent) throw new Error(`Grandchild agent not found: ${grandchildRef}`);
  if (new Set([parentAgent.id, childAgent.id, grandchildAgent.id]).size !== 3) {
    throw new Error("multi-level-delegation scenario requires three distinct agents");
  }

  await assertNoActiveRunsOrWakeups(client, company.id, timeline);
  await probeAgents(client, company.id, [parentAgent, childAgent, grandchildAgent], timeline);

  const tag = `HARNESS-${Date.now()}`;
  const grandchildToken = `grandchild-${tag.slice(-6)}`;
  const alphaToken = `alpha-${tag.slice(-6)}`;
  const cleanup = new CleanupManager();
  const observer = new ScenarioObserver(
    client,
    writer,
    timeline,
    company.id,
    tag,
    [parentAgent, childAgent, grandchildAgent],
    options.pollIntervalMs,
    cleanup,
  );

  let summary: ScenarioSummary | null = null;
  await observer.start();
  try {
    const parentIssue = await client.createIssue(company.id, {
      title: `[${tag}] Multi-level ${parentAgent.name} -> ${childAgent.name} -> ${grandchildAgent.name}`,
      description: [
        `Testing harness tag: ${tag}`,
        "Use the Paperclip skill or API available in your runtime.",
        `Create exactly one child issue assigned to ${childAgent.name} (agent id: ${childAgent.id}).`,
        `That child issue must instruct ${childAgent.name} to create exactly one grandchild issue assigned to ${grandchildAgent.name} (agent id: ${grandchildAgent.id}).`,
        `The grandchild must post a comment containing the exact token "${grandchildToken}" and then mark the grandchild issue closed.`,
        `After the grandchild is closed, ${childAgent.name} must post a summary comment on the child issue containing both "${grandchildToken}" and "${alphaToken}", then mark the child issue closed.`,
        `After the child issue is closed, post a summary comment on this parent issue containing both "${grandchildToken}" and "${alphaToken}", then mark this parent issue closed.`,
        "Do not create extra issues.",
      ].join("\n"),
      assigneeAgentId: parentAgent.id,
      status: "draft",
    });
    cleanup.noteIssue(parentIssue.id);
    observer.trackIssue(parentIssue.id);
    timeline.record("api", "issue", `Created multi-level parent issue ${parentIssue.id}`);

    const checkpoints: ScenarioCheckpoint[] = [];
    const result = await waitForCondition(timeline, options.timeoutSec, "multi-level completion", () => {
      const root = observer.getIssue(parentIssue.id);
      const alphaIssue = observer.issueList().find(
        (issue) => issue.parentId === parentIssue.id && issue.assigneeAgentId === childAgent.id,
      );
      const grandchildIssue = alphaIssue
        ? observer.issueList().find(
            (issue) => issue.parentId === alphaIssue.id && issue.assigneeAgentId === grandchildAgent.id,
          )
        : null;
      const rootComments = observer.commentsForIssue(parentIssue.id);
      const alphaComments = alphaIssue ? observer.commentsForIssue(alphaIssue.id) : [];
      const grandchildComments = grandchildIssue ? observer.commentsForIssue(grandchildIssue.id) : [];
      const parentRuns = observer
        .runList()
        .filter((run) => run.agentId === parentAgent.id && readIssueIdFromPayload(run.contextSnapshot) === parentIssue.id);
      const alphaRuns = alphaIssue
        ? observer
            .runList()
            .filter((run) => run.agentId === childAgent.id && readIssueIdFromPayload(run.contextSnapshot) === alphaIssue.id)
        : [];
      const grandchildRuns = grandchildIssue
        ? observer
            .runList()
            .filter((run) => run.agentId === grandchildAgent.id && readIssueIdFromPayload(run.contextSnapshot) === grandchildIssue.id)
        : [];
      return {
        done:
          root?.status === "closed" &&
          alphaIssue?.status === "closed" &&
          grandchildIssue?.status === "closed" &&
          rootComments.some(
            (comment) =>
              comment.authorAgentId === parentAgent.id &&
              comment.body.includes(grandchildToken) &&
              comment.body.includes(alphaToken),
          ) &&
          alphaComments.some(
            (comment) =>
              comment.authorAgentId === childAgent.id &&
              comment.body.includes(grandchildToken) &&
              comment.body.includes(alphaToken),
          ) &&
          grandchildComments.some(
            (comment) =>
              comment.authorAgentId === grandchildAgent.id &&
              comment.body.includes(grandchildToken),
          ) &&
          parentRuns.length >= 2 &&
          alphaRuns.length >= 2 &&
          grandchildRuns.length > 0,
        detail: JSON.stringify({
          rootStatus: root?.status ?? null,
          alphaIssue: alphaIssue ? { id: alphaIssue.id, status: alphaIssue.status } : null,
          grandchildIssue: grandchildIssue ? { id: grandchildIssue.id, status: grandchildIssue.status } : null,
          parentRunCount: parentRuns.length,
          alphaRunCount: alphaRuns.length,
          grandchildRunCount: grandchildRuns.length,
        }),
      };
    });

    const root = observer.getIssue(parentIssue.id);
    const alphaIssue = observer.issueList().find(
      (issue) => issue.parentId === parentIssue.id && issue.assigneeAgentId === childAgent.id,
    ) ?? null;
    const grandchildIssue = alphaIssue
      ? observer.issueList().find(
          (issue) => issue.parentId === alphaIssue.id && issue.assigneeAgentId === grandchildAgent.id,
        ) ?? null
      : null;
    const rootComments = observer.commentsForIssue(parentIssue.id);
    const alphaComments = alphaIssue ? observer.commentsForIssue(alphaIssue.id) : [];
    const grandchildComments = grandchildIssue ? observer.commentsForIssue(grandchildIssue.id) : [];
    const wakeups = observer.wakeupList();
    const parentRuns = observer
      .runList()
      .filter((run) => run.agentId === parentAgent.id && readIssueIdFromPayload(run.contextSnapshot) === parentIssue.id);
    const alphaRuns = alphaIssue
      ? observer
          .runList()
          .filter((run) => run.agentId === childAgent.id && readIssueIdFromPayload(run.contextSnapshot) === alphaIssue.id)
      : [];
    const grandchildRuns = grandchildIssue
      ? observer
          .runList()
          .filter((run) => run.agentId === grandchildAgent.id && readIssueIdFromPayload(run.contextSnapshot) === grandchildIssue.id)
      : [];
    const latestAlphaWake = alphaIssue ? latestWakeupForAgent(wakeups, childAgent.id, alphaIssue.id) : null;
    const latestParentWake = latestWakeupForAgent(wakeups, parentAgent.id, parentIssue.id);
    const latestAlphaRun = alphaIssue ? latestRunForAgent(observer.runList(), childAgent.id, alphaIssue.id) : null;
    const latestParentRun = latestRunForAgent(observer.runList(), parentAgent.id, parentIssue.id);
    const grandchildDoneAt = dateMs(grandchildIssue?.updatedAt) ?? 0;
    const alphaDoneAt = dateMs(alphaIssue?.updatedAt) ?? 0;

    checkpoints.push({ name: "root-issue-created", passed: true, detail: parentIssue.id });
    checkpoints.push({
      name: "alpha-issue-created",
      passed: Boolean(alphaIssue),
      detail: alphaIssue?.id ?? "missing",
    });
    checkpoints.push({
      name: "grandchild-issue-created",
      passed: Boolean(grandchildIssue),
      detail: grandchildIssue?.id ?? "missing",
    });
    checkpoints.push({
      name: "grandchild-done",
      passed: grandchildIssue?.status === "closed",
      detail: grandchildIssue?.status ?? "missing",
    });
    checkpoints.push({
      name: "alpha-woke-after-grandchild",
      passed:
        alphaRuns.length >= 2 &&
        wakeOrRunObservedAfter(grandchildDoneAt, latestAlphaWake, latestAlphaRun),
      detail: `grandchildDoneAt=${new Date(grandchildDoneAt || 0).toISOString()} latestWake=${latestAlphaWake?.requestedAt ?? "none"} latestRun=${latestAlphaRun?.startedAt ?? latestAlphaRun?.createdAt ?? "none"}`,
    });
    checkpoints.push({
      name: "alpha-summary",
      passed: alphaComments.some(
        (comment) =>
          comment.authorAgentId === childAgent.id &&
          comment.body.includes(grandchildToken) &&
          comment.body.includes(alphaToken),
      ),
      detail: alphaComments.map((comment) => comment.id).join(", "),
    });
    checkpoints.push({
      name: "ceo-woke-after-alpha",
      passed:
        parentRuns.length >= 2 &&
        wakeOrRunObservedAfter(alphaDoneAt, latestParentWake, latestParentRun),
      detail: `alphaDoneAt=${new Date(alphaDoneAt || 0).toISOString()} latestWake=${latestParentWake?.requestedAt ?? "none"} latestRun=${latestParentRun?.startedAt ?? latestParentRun?.createdAt ?? "none"}`,
    });
    checkpoints.push({
      name: "ceo-summary",
      passed: rootComments.some(
        (comment) =>
          comment.authorAgentId === parentAgent.id &&
          comment.body.includes(grandchildToken) &&
          comment.body.includes(alphaToken),
      ),
      detail: rootComments.map((comment) => comment.id).join(", "),
    });
    checkpoints.push({
      name: "comment-flow",
      passed:
        grandchildComments.some(
          (comment) =>
            comment.authorAgentId === grandchildAgent.id &&
            comment.body.includes(grandchildToken),
        ) &&
        alphaComments.some(
          (comment) =>
            comment.authorAgentId === childAgent.id &&
            comment.body.includes(grandchildToken),
        ) &&
        rootComments.some(
          (comment) =>
            comment.authorAgentId === parentAgent.id &&
            comment.body.includes(alphaToken),
        ),
      detail: `grandchild=${grandchildComments.length} alpha=${alphaComments.length} root=${rootComments.length}`,
    });
    checkpoints.push({
      name: "root-done",
      passed: root?.status === "closed",
      detail: root?.status ?? "missing",
    });

    summary = {
      scenario: "multi-level-delegation",
      success: result.done && checkpoints.every((checkpoint) => checkpoint.passed),
      tag,
      startedAt: new Date(timeline.startedAtMs).toISOString(),
      finishedAt: nowIso(),
      companyId: company.id,
      companyName: company.name,
      checkpoints,
      issueIds: cleanup.issueIdList(),
      runIds: cleanup.runIdList(),
      artifactDir: writer.baseDir,
    };
    await fetchRunArtifacts(client, writer, timeline, cleanup.runIdList());
    await writer.writeJson("summary.json", summary);
  } finally {
    await observer.pollOnce();
    await observer.stop();
    await cleanup.cleanup(client, timeline, observer.issueList(), options.keepIssues);
  }

  if (!summary) throw new Error("multi-level-delegation scenario did not produce a summary");
  return summary;
}

async function runAutonomousGoalScenario(
  client: ApiClient,
  options: HarnessOptions,
  company: CompanyRecord,
  agents: AgentRecord[],
  timeline: Timeline,
  writer: ArtifactWriter,
) {
  const parentRef = options.parentAgent ?? options.agent;
  if (!parentRef) throw new Error("autonomous-goal scenario requires --parent-agent");
  const parentAgent = resolveAgent(parentRef, agents);
  if (!parentAgent) throw new Error(`Parent agent not found: ${parentRef}`);
  const childAgents = resolveAgentList(options.childAgents, agents).filter((agent) => agent.id !== parentAgent.id);
  if (childAgents.length < 2 || childAgents.length > 3) {
    throw new Error("autonomous-goal scenario requires 2 or 3 distinct child agents via --child-agents");
  }

  await assertNoActiveRunsOrWakeups(client, company.id, timeline);
  await probeAgents(client, company.id, [parentAgent, ...childAgents], timeline);

  const tag = `HARNESS-${Date.now()}`;
  const workspaceDir = ensureAgentWorkspace(parentAgent.id);
  const artifactDir = path.join(workspaceDir, "harness", tag);
  const artifactPath = path.join(artifactDir, "autonomous-goal-brief.md");
  await mkdir(artifactDir, { recursive: true });
  await rm(artifactPath, { force: true });
  await writer.writeJson("workspace-setup.json", { workspaceDir, artifactPath });
  timeline.record("diag", "setup", `Reserved autonomous artifact path ${artifactPath}`);

  const cleanup = new CleanupManager();
  const observer = new ScenarioObserver(
    client,
    writer,
    timeline,
    company.id,
    tag,
    [parentAgent, ...childAgents],
    options.pollIntervalMs,
    cleanup,
  );

  let summary: ScenarioSummary | null = null;
  await observer.start();
  try {
    const parentIssue = await client.createIssue(company.id, {
      title: `[${tag}] Autonomous goal for ${parentAgent.name}`,
      description: [
        `Testing harness tag: ${tag}`,
        `Goal: produce a concrete markdown artifact at ${artifactPath}.`,
        "You have teammate agents available for delegation. Break the goal down into child work assigned to the requested teammates, collect their outputs, and then create the artifact.",
        "The artifact must include these exact section headings:",
        `# Autonomous Brief ${tag}`,
        "## Research Notes",
        "## Risks",
        "## Next Steps",
        `The artifact must also mention every child assignee name: ${childAgents.map((agent) => agent.name).join(", ")}.`,
        "Each child issue should ask its assignee to post at least one concrete bullet comment and then mark the child issue closed.",
        `After writing the artifact, post one summary comment on this parent issue with the exact artifact path "${artifactPath}" and mark the parent issue closed.`,
        "Do not stop at comments only; the file is required.",
      ].join("\n"),
      assigneeAgentId: parentAgent.id,
      status: "draft",
    });
    cleanup.noteIssue(parentIssue.id);
    observer.trackIssue(parentIssue.id);
    timeline.record("api", "issue", `Created autonomous-goal parent issue ${parentIssue.id}`);

    const checkpoints: ScenarioCheckpoint[] = [];
    const result = await waitForCondition(timeline, options.timeoutSec, "autonomous goal completion", () => {
      const parent = observer.getIssue(parentIssue.id);
      const childIssues = observer.issueList().filter((issue) => issue.parentId === parentIssue.id);
      const parentComments = observer.commentsForIssue(parentIssue.id);
      const childComments = childIssues.flatMap((issue) => observer.commentsForIssue(issue.id));
      return {
        done:
          parent?.status === "closed" &&
          childAgents.every((agent) => childIssues.some((issue) => issue.assigneeAgentId === agent.id && issue.status === "closed")) &&
          childComments.length >= childAgents.length &&
          parentComments.some(
            (comment) =>
              comment.authorAgentId === parentAgent.id &&
              comment.body.includes(artifactPath),
          ),
        detail: JSON.stringify({
          parentStatus: parent?.status ?? null,
          childIssues: childIssues.map((issue) => ({
            id: issue.id,
            status: issue.status,
            assigneeAgentId: issue.assigneeAgentId,
          })),
          parentCommentCount: parentComments.length,
        }),
      };
    });

    const parent = observer.getIssue(parentIssue.id);
    const childIssues = observer.issueList().filter((issue) => issue.parentId === parentIssue.id);
    const parentComments = observer.commentsForIssue(parentIssue.id);
    const childComments = childIssues.flatMap((issue) => observer.commentsForIssue(issue.id));
    const artifactText = await readTextIfExists(artifactPath);

    checkpoints.push({ name: "parent-issue-created", passed: true, detail: parentIssue.id });
    checkpoints.push({
      name: "child-work-decomposed",
      passed: childIssues.length >= childAgents.length,
      detail: childIssues.map((issue) => `${issue.id}:${issue.assigneeAgentId ?? "none"}`).join(", "),
    });
    checkpoints.push({
      name: "children-assigned",
      passed: childAgents.every((agent) => childIssues.some((issue) => issue.assigneeAgentId === agent.id)),
      detail: childIssues.map((issue) => `${issue.id}:${issue.assigneeAgentId ?? "none"}`).join(", "),
    });
    checkpoints.push({
      name: "children-done",
      passed: childAgents.every((agent) => childIssues.some((issue) => issue.assigneeAgentId === agent.id && issue.status === "closed")),
      detail: childIssues.map((issue) => `${issue.id}:${issue.status}`).join(", "),
    });
    checkpoints.push({
      name: "artifact-created",
      passed: artifactText !== null,
      detail: artifactPath,
    });
    checkpoints.push({
      name: "artifact-contains-sections",
      passed:
        artifactText !== null &&
        artifactText.includes(`# Autonomous Brief ${tag}`) &&
        artifactText.includes("## Research Notes") &&
        artifactText.includes("## Risks") &&
        artifactText.includes("## Next Steps"),
      detail: artifactPath,
    });
    checkpoints.push({
      name: "artifact-references-child-work",
      passed:
        artifactText !== null &&
        childAgents.every((agent) => artifactText.toLowerCase().includes(agent.name.toLowerCase())),
      detail: artifactPath,
    });
    checkpoints.push({
      name: "parent-comment-path",
      passed: parentComments.some(
        (comment) =>
          comment.authorAgentId === parentAgent.id &&
          comment.body.includes(artifactPath),
      ),
      detail: parentComments.map((comment) => comment.id).join(", "),
    });
    checkpoints.push({
      name: "child-comments",
      passed: childComments.length >= childAgents.length,
      detail: childComments.map((comment) => comment.id).join(", "),
    });
    checkpoints.push({
      name: "parent-done",
      passed: parent?.status === "closed",
      detail: parent?.status ?? "missing",
    });

    summary = {
      scenario: "autonomous-goal",
      success: result.done && checkpoints.every((checkpoint) => checkpoint.passed),
      tag,
      startedAt: new Date(timeline.startedAtMs).toISOString(),
      finishedAt: nowIso(),
      companyId: company.id,
      companyName: company.name,
      checkpoints,
      issueIds: cleanup.issueIdList(),
      runIds: cleanup.runIdList(),
      artifactDir: writer.baseDir,
    };
    await fetchRunArtifacts(client, writer, timeline, cleanup.runIdList());
    await writer.writeJson("summary.json", summary);
  } finally {
    await observer.pollOnce();
    await observer.stop();
    await cleanup.cleanup(client, timeline, observer.issueList(), options.keepIssues);
  }

  if (!summary) throw new Error("autonomous-goal scenario did not produce a summary");
  return summary;
}

async function executeScenarioById(
  scenarioId: OrchestrationScenarioId,
  client: ApiClient,
  options: HarnessOptions,
  company: CompanyRecord,
  agents: AgentRecord[],
  artifactDir: string,
) {
  await rm(artifactDir, { recursive: true, force: true });
  await mkdir(artifactDir, { recursive: true });
  const writer = new ArtifactWriter(artifactDir);
  const timeline = new Timeline(writer);

  try {
    timeline.record("diag", "start", `Starting ${scenarioId} scenario against ${options.baseUrl}`);
    timeline.record("diag", "context", `Resolved company ${company.name} (${company.id}) with ${agents.length} agents`);

    if (scenarioId === "health") {
      return await runHealthScenario(client, options, company, agents, timeline, writer);
    }
    if (scenarioId === "single-agent") {
      return await runSingleAgentScenario(client, options, company, agents, timeline, writer);
    }
    if (scenarioId === "single-agent-blocked") {
      return await runSingleAgentBlockedScenario(client, options, company, agents, timeline, writer);
    }
    if (scenarioId === "realwork-read") {
      return await runRealworkReadScenario(client, options, company, agents, timeline, writer);
    }
    if (scenarioId === "realwork-write") {
      return await runRealworkWriteScenario(client, options, company, agents, timeline, writer);
    }
    if (scenarioId === "realwork-api") {
      return await runRealworkApiScenario(client, options, company, agents, timeline, writer);
    }
    if (scenarioId === "delegation") {
      return await runDelegationScenario(client, options, company, agents, timeline, writer);
    }
    if (scenarioId === "delegation-failure") {
      return await runDelegationFailureScenario(client, options, company, agents, timeline, writer);
    }
    if (scenarioId === "fan-out") {
      return await runFanOutScenario(client, options, company, agents, timeline, writer);
    }
    if (scenarioId === "multi-level-delegation") {
      return await runMultiLevelDelegationScenario(client, options, company, agents, timeline, writer);
    }
    return await runAutonomousGoalScenario(client, options, company, agents, timeline, writer);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    timeline.record("diag", "error", message);
    const summary: ScenarioSummary = {
      scenario: scenarioId,
      success: false,
      tag: scenarioId,
      startedAt: new Date(timeline.startedAtMs).toISOString(),
      finishedAt: nowIso(),
      companyId: company.id,
      companyName: company.name,
      checkpoints: [],
      issueIds: [],
      runIds: [],
      artifactDir,
      error: message,
    };
    await writer.writeJson("summary.json", summary);
    return summary;
  } finally {
    await timeline.flush();
  }
}

async function main() {
  stopRequestedBySignal = null;
  const options = parseArgs(process.argv.slice(2));
  if (options.listScenarios) {
    console.log(formatScenarioCatalog());
    return;
  }

  const selection = resolveScenarioSelection({
    scenario: options.scenario ?? null,
    suite: options.suite ?? null,
  });
  const missingRequirements = validateScenarioRequirements(selection.scenarioIds, {
    agent: options.agent,
    parentAgent: options.parentAgent,
    childAgent: options.childAgent,
    childAgents: options.childAgents,
    grandchildAgent: options.grandchildAgent,
  });
  if (missingRequirements.length > 0) {
    throw new Error(
      `Missing required options for ${selection.mode === "suite" ? `suite ${selection.suiteId}` : `scenario ${selection.scenarioIds[0]}`}: ${missingRequirements.join(", ")}`,
    );
  }

  const startedAtDate = new Date();
  const startedAt = startedAtDate.toISOString();
  const rootArtifactDir = path.join(
    options.artifactRoot,
    `${formatArtifactTimestampEt(startedAtDate)}-${
      selection.mode === "suite" ? `suite-${selection.suiteId}` : selection.scenarioIds[0]
    }`,
  );
  await rm(rootArtifactDir, { recursive: true, force: true });
  await mkdir(rootArtifactDir, { recursive: true });
  const rootWriter = new ArtifactWriter(rootArtifactDir);
  const rootTimeline = new Timeline(rootWriter);
  const client = new ApiClient(options.baseUrl, {
    authHeader: options.authHeader ?? process.env.PAPERCLIP_AUTH_HEADER,
    cookie: options.cookie ?? process.env.PAPERCLIP_COOKIE,
  });

  let summaries: ScenarioSummary[] = [];
  let exitCode = 0;

  const onSignal = (signal: NodeJS.Signals) => {
    stopRequestedBySignal = signal;
    rootTimeline.record("diag", "signal", `Received ${signal}; finishing cleanup and exiting`);
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  try {
    rootTimeline.record("diag", "start", `Starting ${selection.mode} execution against ${options.baseUrl}`);
    await client.authenticate(rootTimeline, options.email, options.password);
    const company = await resolveCompany(client, options.companyId);
    const agents = await client.listAgents(company.id);
    rootTimeline.record(
      "diag",
      "context",
      `Resolved company ${company.name} (${company.id}) with ${agents.length} agents; executing ${selection.scenarioIds.join(", ")}`,
    );

    for (const scenarioId of selection.scenarioIds) {
      const scenarioDir = path.join(rootArtifactDir, scenarioId);
      const summary = await executeScenarioById(scenarioId, client, options, company, agents, scenarioDir);
      summaries.push(summary);
      rootTimeline.record(
        "diag",
        "scenario",
        `${scenarioId} ${summary.success ? "passed" : "failed"}`,
      );
    }

    const aggregate = summarizeSuiteRuns(selection, summaries);
    const suiteOutput = {
      ...aggregate,
      startedAt,
      finishedAt: nowIso(),
      artifactDir: rootArtifactDir,
      summaries,
    };
    await rootWriter.writeJson("suite-summary.json", suiteOutput);
    await rootWriter.writeText("suite-report.md", renderSuiteReport(suiteOutput));

    if (!aggregate.success) {
      exitCode = 1;
      rootTimeline.record(
        "diag",
        "result",
        `${selection.mode === "suite" ? `suite ${selection.suiteId}` : selection.scenarioIds[0]} failed`,
      );
    } else {
      rootTimeline.record(
        "diag",
        "result",
        `${selection.mode === "suite" ? `suite ${selection.suiteId}` : selection.scenarioIds[0]} passed`,
      );
    }
  } catch (err) {
    exitCode = 1;
    const message = err instanceof Error ? err.message : String(err);
    rootTimeline.record("diag", "error", message);
    if (summaries.length === 0) {
      const suiteOutput = {
        mode: selection.mode,
        suiteId: selection.suiteId,
        scenarioIds: selection.scenarioIds,
        success: false,
        startedAt,
        finishedAt: nowIso(),
        error: message,
        artifactDir: rootArtifactDir,
        summaries,
        total: 0,
        passed: 0,
        failed: 0,
      };
      await rootWriter.writeJson("suite-summary.json", suiteOutput);
      await rootWriter.writeText("suite-report.md", renderSuiteReport(suiteOutput));
    }
  } finally {
    if (stopRequestedBySignal) exitCode = 130;
    await rootTimeline.flush();
    process.exitCode = exitCode;
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
  }

  if (summaries.length > 0) {
    const aggregate = summarizeSuiteRuns(selection, summaries);
    console.log("");
    console.log(aggregate.success ? "PASS" : "FAIL");
    console.log(`Selection: ${selection.mode === "suite" ? `suite ${selection.suiteId}` : `scenario ${selection.scenarioIds[0]}`}`);
    console.log(`Artifacts: ${rootArtifactDir}`);
    for (const summary of summaries) {
      console.log(`- ${summary.success ? "ok" : "fail"} ${summary.scenario}`);
      for (const checkpoint of summary.checkpoints) {
        console.log(`  ${checkpoint.passed ? "ok" : "fail"} ${checkpoint.name}${checkpoint.detail ? ` :: ${checkpoint.detail}` : ""}`);
      }
    }
  }
}

const isDirectExecution =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  void main().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    process.exitCode = 1;
  });
}