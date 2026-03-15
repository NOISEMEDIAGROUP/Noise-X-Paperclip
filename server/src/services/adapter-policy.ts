import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  adapterExecutionPolicies,
  adapterToolContracts,
  agents,
  companies,
  costEvents,
  heartbeatRuns,
  issues,
  telemetryRecords,
} from "@paperclipai/db";
import type { AdapterExecutionResult } from "../adapters/index.js";
import type {
  AdapterContractDeterminismLevel,
  AdapterErrorClass,
  AdapterExecutionPolicyScope,
  AdapterPressureRoute,
  AdapterRetryClass,
  AdapterToolContractStatus,
} from "@paperclipai/shared";
import { unprocessable } from "../errors.js";

const ACTIVE_RUN_STATUSES: Array<typeof heartbeatRuns.$inferSelect.status> = ["queued", "running"];
const DEFAULT_POLICY_SCOPE: AdapterExecutionPolicyScope = "global";
const DEFAULT_POLICY_MAX_PARALLEL_RUNS = 3;
const DEFAULT_POLICY_MAX_RETRY_ATTEMPTS = 1;
const DEFAULT_POLICY_COST_PRESSURE_THRESHOLD = 0.9;
const DEFAULT_POLICY_ERROR_PRESSURE_THRESHOLD = 0.25;
const DEFAULT_POLICY_ROUTE: AdapterPressureRoute = "degrade";
const ERROR_PRESSURE_LOOKBACK_HOURS = 24;

const ADAPTER_ERROR_CLASSES: readonly AdapterErrorClass[] = [
  "timeout",
  "rate_limited",
  "auth",
  "invalid_request",
  "tool_contract",
  "runtime",
  "unknown",
] as const;

const ADAPTER_RETRY_CLASSES: readonly AdapterRetryClass[] = [
  "none",
  "retryable",
  "non_retryable",
  "exhausted",
] as const;

const ADAPTER_PRESSURE_ROUTES: readonly AdapterPressureRoute[] = [
  "pause",
  "degrade",
  "escalate",
  "reroute",
] as const;

const ADAPTER_EXECUTION_POLICY_SCOPES: readonly AdapterExecutionPolicyScope[] = [
  "global",
  "role",
  "project",
] as const;

const ADAPTER_CONTRACT_DETERMINISM_LEVELS: readonly AdapterContractDeterminismLevel[] = [
  "strict",
  "best_effort",
] as const;

const ADAPTER_TOOL_CONTRACT_STATUSES: readonly AdapterToolContractStatus[] = [
  "active",
  "deprecated",
  "disabled",
] as const;

type AdapterToolContractRow = typeof adapterToolContracts.$inferSelect;
type AdapterExecutionPolicyRow = typeof adapterExecutionPolicies.$inferSelect;

export const DEFAULT_ADAPTER_TOOL_NAME = "heartbeat.execute";

export type ResolvedAdapterToolContract = AdapterToolContractRow & { source: "db" };

export type AdapterPolicyPressureSnapshot = {
  monthSpendCents: number;
  monthBudgetCents: number;
  costPressureRatio: number;
  errorPressureRatio: number;
};

export type AdapterPolicyGateDecision = {
  allowed: boolean;
  degraded: boolean;
  routeAction: AdapterPressureRoute | null;
  reasonCode:
    | "ok"
    | "max_parallel_runs_exceeded"
    | "max_retry_attempts_exceeded"
    | "pressure_threshold_exceeded";
  reason: string | null;
  maxParallelRuns: number;
  maxRetryAttempts: number;
  activeRuns: number;
  retryAttempt: number;
  costThreshold: number;
  errorThreshold: number;
  pressure: AdapterPolicyPressureSnapshot;
};

export type AdapterPolicyGateResult = {
  policy: AdapterExecutionPolicyRow;
  policyMatchedFromDb: boolean;
  decision: AdapterPolicyGateDecision;
};

export type AdapterContractValidationResult = {
  valid: boolean;
  errors: string[];
};

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asFiniteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asNonNegativeInteger(value: unknown, fallback: number): number {
  const parsed = Math.floor(asFiniteNumber(value, fallback));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
}

function isAdapterErrorClass(value: unknown): value is AdapterErrorClass {
  return typeof value === "string" && (ADAPTER_ERROR_CLASSES as readonly string[]).includes(value);
}

function isAdapterRetryClass(value: unknown): value is AdapterRetryClass {
  return typeof value === "string" && (ADAPTER_RETRY_CLASSES as readonly string[]).includes(value);
}

function isAdapterPressureRoute(value: unknown): value is AdapterPressureRoute {
  return typeof value === "string" && (ADAPTER_PRESSURE_ROUTES as readonly string[]).includes(value);
}

function isAdapterExecutionPolicyScope(value: unknown): value is AdapterExecutionPolicyScope {
  return typeof value === "string" && (ADAPTER_EXECUTION_POLICY_SCOPES as readonly string[]).includes(value);
}

function isAdapterContractDeterminismLevel(value: unknown): value is AdapterContractDeterminismLevel {
  return typeof value === "string" && (ADAPTER_CONTRACT_DETERMINISM_LEVELS as readonly string[]).includes(value);
}

function isAdapterToolContractStatus(value: unknown): value is AdapterToolContractStatus {
  return typeof value === "string" && (ADAPTER_TOOL_CONTRACT_STATUSES as readonly string[]).includes(value);
}

function normalizeThreshold(value: unknown, fallback: number): number {
  const parsed = asFiniteNumber(value, fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
}

function normalizePolicyScope(value: unknown): AdapterExecutionPolicyScope {
  return isAdapterExecutionPolicyScope(value) ? value : DEFAULT_POLICY_SCOPE;
}

function normalizePressureRoute(value: unknown): AdapterPressureRoute {
  return isAdapterPressureRoute(value) ? value : DEFAULT_POLICY_ROUTE;
}

function normalizeDeterminismLevel(value: unknown): AdapterContractDeterminismLevel {
  return isAdapterContractDeterminismLevel(value) ? value : "best_effort";
}

function normalizeToolContractStatus(value: unknown): AdapterToolContractStatus {
  return isAdapterToolContractStatus(value) ? value : "active";
}

function normalizeNullableRoleKey(value: unknown): string | null {
  return readNonEmptyString(value);
}

function normalizeNullableProjectId(value: unknown): string | null {
  return readNonEmptyString(value);
}

function clampMaxParallelRuns(value: unknown): number {
  const parsed = asNonNegativeInteger(value, DEFAULT_POLICY_MAX_PARALLEL_RUNS);
  if (parsed <= 0) return 1;
  return Math.min(parsed, 100);
}

function clampMaxRetryAttempts(value: unknown): number {
  const parsed = asNonNegativeInteger(value, DEFAULT_POLICY_MAX_RETRY_ATTEMPTS);
  return Math.min(parsed, 20);
}

function safeRatio(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return Math.max(0, numerator / denominator);
}

function normalizeDate(value: Date | null | undefined): number {
  if (!value) return 0;
  const ts = value.getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function comparePolicyRecency(
  left: Pick<AdapterExecutionPolicyRow, "updatedAt" | "createdAt" | "id">,
  right: Pick<AdapterExecutionPolicyRow, "updatedAt" | "createdAt" | "id">,
): number {
  const byUpdated = normalizeDate(right.updatedAt) - normalizeDate(left.updatedAt);
  if (byUpdated !== 0) return byUpdated;
  const byCreated = normalizeDate(right.createdAt) - normalizeDate(left.createdAt);
  if (byCreated !== 0) return byCreated;
  return right.id.localeCompare(left.id);
}

function selectPolicyCandidatesByScope(
  policies: AdapterExecutionPolicyRow[],
  input: { roleKey: string | null; projectId: string | null },
): AdapterExecutionPolicyRow[] {
  const projectMatches = policies
    .filter((policy) => policy.policyScope === "project" && policy.projectId && input.projectId)
    .filter((policy) => policy.projectId === input.projectId);
  if (projectMatches.length > 0) {
    return projectMatches.sort(comparePolicyRecency);
  }

  const roleMatches = policies
    .filter((policy) => policy.policyScope === "role" && policy.roleKey && input.roleKey)
    .filter((policy) => policy.roleKey === input.roleKey);
  if (roleMatches.length > 0) {
    return roleMatches.sort(comparePolicyRecency);
  }

  const globalMatches = policies
    .filter((policy) => policy.policyScope === "global")
    .sort(comparePolicyRecency);
  return globalMatches;
}

function normalizePolicyRecord(policy: AdapterExecutionPolicyRow): AdapterExecutionPolicyRow {
  return {
    ...policy,
    policyScope: normalizePolicyScope(policy.policyScope),
    roleKey: normalizeNullableRoleKey(policy.roleKey),
    projectId: normalizeNullableProjectId(policy.projectId),
    maxParallelRuns: clampMaxParallelRuns(policy.maxParallelRuns),
    maxRetryAttempts: clampMaxRetryAttempts(policy.maxRetryAttempts),
    costPressureThreshold: normalizeThreshold(policy.costPressureThreshold, DEFAULT_POLICY_COST_PRESSURE_THRESHOLD),
    errorPressureThreshold: normalizeThreshold(policy.errorPressureThreshold, DEFAULT_POLICY_ERROR_PRESSURE_THRESHOLD),
    routeOnPressure: normalizePressureRoute(policy.routeOnPressure),
  };
}

function buildDefaultPolicy(companyId: string): AdapterExecutionPolicyRow {
  const now = new Date(0);
  return {
    id: "00000000-0000-0000-0000-000000000000",
    companyId,
    policyScope: DEFAULT_POLICY_SCOPE,
    roleKey: null,
    projectId: null,
    maxParallelRuns: DEFAULT_POLICY_MAX_PARALLEL_RUNS,
    maxRetryAttempts: DEFAULT_POLICY_MAX_RETRY_ATTEMPTS,
    costPressureThreshold: DEFAULT_POLICY_COST_PRESSURE_THRESHOLD,
    errorPressureThreshold: DEFAULT_POLICY_ERROR_PRESSURE_THRESHOLD,
    routeOnPressure: DEFAULT_POLICY_ROUTE,
    createdAt: now,
    updatedAt: now,
  };
}

export function defaultAdapterContractRequestSchema(): Record<string, unknown> {
  return {
    type: "object",
    required: ["runId", "companyId", "agentId", "adapterType", "runtime", "config", "context"],
    properties: {
      runId: { type: "string" },
      companyId: { type: "string" },
      agentId: { type: "string" },
      adapterType: { type: "string" },
      runtime: {
        type: "object",
        properties: {
          sessionId: { type: ["string", "null"] },
          taskKey: { type: ["string", "null"] },
        },
      },
      config: { type: "object" },
      context: { type: "object" },
    },
    additionalProperties: true,
  };
}

export function defaultAdapterContractResponseSchema(): Record<string, unknown> {
  return {
    type: "object",
    required: ["exitCode", "signal", "timedOut"],
    properties: {
      exitCode: { type: ["integer", "null"] },
      signal: { type: ["string", "null"] },
      timedOut: { type: "boolean" },
      errorMessage: { type: ["string", "null"] },
      errorCode: { type: ["string", "null"] },
      usage: { type: ["object", "null"] },
      provider: { type: ["string", "null"] },
      model: { type: ["string", "null"] },
      billingType: { type: ["string", "null"] },
      costUsd: { type: ["number", "null"] },
      resultJson: { type: ["object", "null"] },
      summary: { type: ["string", "null"] },
      clearSession: { type: ["boolean", "null"] },
      sessionId: { type: ["string", "null"] },
      sessionDisplayId: { type: ["string", "null"] },
      sessionParams: { type: ["object", "null"] },
    },
    additionalProperties: true,
  };
}

function hasKeyword(value: string, candidates: string[]): boolean {
  return candidates.some((candidate) => value.includes(candidate));
}

export function normalizeAdapterErrorClass(input: {
  status?: string | null;
  timedOut?: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
  resultJson?: Record<string, unknown> | null;
}): AdapterErrorClass | null {
  const status = readNonEmptyString(input.status)?.toLowerCase() ?? null;
  const code = readNonEmptyString(input.errorCode)?.toLowerCase() ?? "";
  const message = readNonEmptyString(input.errorMessage)?.toLowerCase() ?? "";
  const result = asRecord(input.resultJson);
  const responseStatus = asFiniteNumber(result.status, Number.NaN);
  const combined = `${code}\n${message}`;

  if ((status === "succeeded" || status === "completed") && !input.timedOut && !code && !message) {
    return null;
  }

  if (
    input.timedOut ||
    status === "timed_out" ||
    hasKeyword(combined, ["timeout", "timed out", "deadline exceeded", "watchdog_timeout"])
  ) {
    return "timeout";
  }

  if (
    hasKeyword(combined, ["rate limit", "ratelimit", "too many requests", "rate_limited"]) ||
    responseStatus === 429
  ) {
    return "rate_limited";
  }

  if (
    hasKeyword(combined, [
      "auth",
      "unauthorized",
      "forbidden",
      "permission denied",
      "access denied",
      "requires login",
      "api key",
      "token",
    ])
  ) {
    return "auth";
  }

  if (code === "tool_contract_missing") {
    return "tool_contract";
  }

  if (hasKeyword(combined, ["tool_contract", "contract schema", "schema mismatch"])) {
    return "tool_contract";
  }

  if (
    hasKeyword(combined, [
      "invalid request",
      "bad request",
      "unprocessable",
      "validation",
      "required field",
      "text required",
      "text_required",
      "invalid_",
    ]) ||
    responseStatus === 400 ||
    responseStatus === 422
  ) {
    return "invalid_request";
  }

  if (status === "failed" || code.length > 0 || message.length > 0) {
    return "runtime";
  }

  return "unknown";
}

export function normalizeAdapterRetryClass(input: {
  errorClass: AdapterErrorClass | null;
  retryAttempt: number;
  maxRetryAttempts: number;
}): AdapterRetryClass {
  if (!input.errorClass) return "none";
  if (!isAdapterErrorClass(input.errorClass)) return "none";

  if (input.errorClass === "auth" || input.errorClass === "invalid_request" || input.errorClass === "tool_contract") {
    return "non_retryable";
  }

  const retryAttempt = Math.max(0, Math.floor(input.retryAttempt));
  const maxRetryAttempts = Math.max(0, Math.floor(input.maxRetryAttempts));
  if (maxRetryAttempts === 0 || retryAttempt >= maxRetryAttempts) {
    return "exhausted";
  }
  return "retryable";
}

function payloadType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

function matchesType(expected: string, value: unknown): boolean {
  switch (expected) {
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value);
    case "array":
      return Array.isArray(value);
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    default:
      return true;
  }
}

function validateSchemaNode(input: {
  schema: Record<string, unknown>;
  value: unknown;
  path: string;
  depth: number;
  errors: string[];
}) {
  const { schema, value, path, errors } = input;
  if (input.depth > 32) {
    errors.push(`${path}: schema validation exceeded maximum depth`);
    return;
  }

  if (Object.prototype.hasOwnProperty.call(schema, "const") && !Object.is(schema.const, value)) {
    errors.push(`${path}: expected constant value`);
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    if (!schema.enum.some((entry) => Object.is(entry, value))) {
      errors.push(`${path}: value is not in enum`);
    }
  }

  const typeValue = schema.type;
  const typeCandidates: string[] = Array.isArray(typeValue)
    ? typeValue.filter((entry): entry is string => typeof entry === "string")
    : typeof typeValue === "string"
      ? [typeValue]
      : [];
  if (typeCandidates.length > 0) {
    const validType = typeCandidates.some((candidate) => matchesType(candidate, value));
    if (!validType) {
      errors.push(`${path}: expected ${typeCandidates.join(" | ")}, received ${payloadType(value)}`);
      return;
    }
  }

  if (typeof value === "string") {
    const minLength = asNonNegativeInteger(schema.minLength, -1);
    if (minLength >= 0 && value.length < minLength) {
      errors.push(`${path}: expected minimum length ${minLength}`);
    }
    const maxLength = asNonNegativeInteger(schema.maxLength, Number.MAX_SAFE_INTEGER);
    if (maxLength >= 0 && value.length > maxLength) {
      errors.push(`${path}: expected maximum length ${maxLength}`);
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const minimum = asFiniteNumber(schema.minimum, Number.NaN);
    if (Number.isFinite(minimum) && value < minimum) {
      errors.push(`${path}: expected value >= ${minimum}`);
    }
    const maximum = asFiniteNumber(schema.maximum, Number.NaN);
    if (Number.isFinite(maximum) && value > maximum) {
      errors.push(`${path}: expected value <= ${maximum}`);
    }
  }

  if (Array.isArray(value)) {
    const minItems = asNonNegativeInteger(schema.minItems, -1);
    if (minItems >= 0 && value.length < minItems) {
      errors.push(`${path}: expected at least ${minItems} item(s)`);
    }
    const maxItems = asNonNegativeInteger(schema.maxItems, Number.MAX_SAFE_INTEGER);
    if (maxItems >= 0 && value.length > maxItems) {
      errors.push(`${path}: expected at most ${maxItems} item(s)`);
    }
    const itemSchema = asRecord(schema.items);
    if (Object.keys(itemSchema).length > 0) {
      for (let idx = 0; idx < value.length; idx += 1) {
        validateSchemaNode({
          schema: itemSchema,
          value: value[idx],
          path: `${path}[${idx}]`,
          depth: input.depth + 1,
          errors,
        });
      }
    }
    return;
  }

  const objectValue = asRecord(value);
  if (Object.keys(objectValue).length === 0 && !matchesType("object", value)) {
    return;
  }

  const required = Array.isArray(schema.required)
    ? schema.required.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    : [];
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(objectValue, key)) {
      errors.push(`${path}.${key}: required`);
    }
  }

  const properties = asRecord(schema.properties);
  for (const [key, propertySchemaRaw] of Object.entries(properties)) {
    if (!Object.prototype.hasOwnProperty.call(objectValue, key)) continue;
    const propertySchema = asRecord(propertySchemaRaw);
    if (Object.keys(propertySchema).length === 0) continue;
    validateSchemaNode({
      schema: propertySchema,
      value: objectValue[key],
      path: `${path}.${key}`,
      depth: input.depth + 1,
      errors,
    });
  }

  if (schema.additionalProperties === false && Object.keys(properties).length > 0) {
    const allowed = new Set(Object.keys(properties));
    for (const key of Object.keys(objectValue)) {
      if (!allowed.has(key)) {
        errors.push(`${path}.${key}: additional properties are not allowed`);
      }
    }
  }
}

export function validateSchemaPayload(
  schemaRaw: Record<string, unknown> | null | undefined,
  payload: unknown,
): AdapterContractValidationResult {
  const schema = asRecord(schemaRaw);
  if (Object.keys(schema).length === 0) {
    return { valid: true, errors: [] };
  }
  const errors: string[] = [];
  validateSchemaNode({
    schema,
    value: payload,
    path: "$",
    depth: 0,
    errors,
  });
  return { valid: errors.length === 0, errors };
}

export function buildAdapterContractRequestPayload(input: {
  runId: string;
  companyId: string;
  agentId: string;
  adapterType: string;
  runtime: {
    sessionId: string | null;
    taskKey: string | null;
  };
  config: Record<string, unknown>;
  context: Record<string, unknown>;
}) {
  return {
    runId: input.runId,
    companyId: input.companyId,
    agentId: input.agentId,
    adapterType: input.adapterType,
    runtime: {
      sessionId: input.runtime.sessionId,
      taskKey: input.runtime.taskKey,
    },
    config: input.config,
    context: input.context,
  };
}

export function buildAdapterContractResponsePayload(result: AdapterExecutionResult) {
  return {
    exitCode: result.exitCode,
    signal: result.signal,
    timedOut: result.timedOut,
    errorMessage: result.errorMessage ?? null,
    errorCode: result.errorCode ?? null,
    usage: result.usage ?? null,
    provider: result.provider ?? null,
    model: result.model ?? null,
    billingType: result.billingType ?? null,
    costUsd: result.costUsd ?? null,
    resultJson: result.resultJson ?? null,
    summary: result.summary ?? null,
    clearSession: result.clearSession ?? null,
    sessionId: result.sessionId ?? null,
    sessionDisplayId: result.sessionDisplayId ?? null,
    sessionParams: result.sessionParams ?? null,
  };
}

export function validateAdapterContractPayload(input: {
  contract: Pick<ResolvedAdapterToolContract, "requestSchemaJson" | "responseSchemaJson">;
  payload: unknown;
  direction: "request" | "response";
}): AdapterContractValidationResult {
  const schema = input.direction === "request"
    ? asRecord(input.contract.requestSchemaJson)
    : asRecord(input.contract.responseSchemaJson);
  return validateSchemaPayload(schema, input.payload);
}

export function selectApplicableExecutionPolicy(input: {
  policies: AdapterExecutionPolicyRow[];
  companyId: string;
  roleKey: string | null;
  projectId: string | null;
}): AdapterExecutionPolicyRow | null {
  const companyPolicies = input.policies
    .filter((policy) => policy.companyId === input.companyId)
    .map((policy) => normalizePolicyRecord(policy));
  if (companyPolicies.length === 0) return null;

  const candidates = selectPolicyCandidatesByScope(companyPolicies, {
    roleKey: normalizeNullableRoleKey(input.roleKey),
    projectId: normalizeNullableProjectId(input.projectId),
  });
  return candidates[0] ?? null;
}

export function evaluatePolicyGate(input: {
  policy: AdapterExecutionPolicyRow;
  activeRuns: number;
  retryAttempt: number;
  pressure: AdapterPolicyPressureSnapshot;
}): AdapterPolicyGateDecision {
  const policy = normalizePolicyRecord(input.policy);
  const activeRuns = Math.max(0, Math.floor(input.activeRuns));
  const retryAttempt = Math.max(0, Math.floor(input.retryAttempt));
  const maxParallelRuns = clampMaxParallelRuns(policy.maxParallelRuns);
  const maxRetryAttempts = clampMaxRetryAttempts(policy.maxRetryAttempts);
  const costThreshold = normalizeThreshold(
    policy.costPressureThreshold,
    DEFAULT_POLICY_COST_PRESSURE_THRESHOLD,
  );
  const errorThreshold = normalizeThreshold(
    policy.errorPressureThreshold,
    DEFAULT_POLICY_ERROR_PRESSURE_THRESHOLD,
  );

  if (activeRuns >= maxParallelRuns) {
    return {
      allowed: false,
      degraded: false,
      routeAction: "pause",
      reasonCode: "max_parallel_runs_exceeded",
      reason: `max_parallel_runs exceeded (${activeRuns} active, limit ${maxParallelRuns})`,
      maxParallelRuns,
      maxRetryAttempts,
      activeRuns,
      retryAttempt,
      costThreshold,
      errorThreshold,
      pressure: input.pressure,
    };
  }

  if (retryAttempt > maxRetryAttempts) {
    return {
      allowed: false,
      degraded: false,
      routeAction: "pause",
      reasonCode: "max_retry_attempts_exceeded",
      reason: `max_retry_attempts exceeded (${retryAttempt}, limit ${maxRetryAttempts})`,
      maxParallelRuns,
      maxRetryAttempts,
      activeRuns,
      retryAttempt,
      costThreshold,
      errorThreshold,
      pressure: input.pressure,
    };
  }

  const costExceeded = input.pressure.costPressureRatio >= costThreshold;
  const errorExceeded = input.pressure.errorPressureRatio >= errorThreshold;
  if (costExceeded || errorExceeded) {
    const routeAction = normalizePressureRoute(policy.routeOnPressure);
    const reasonParts: string[] = [];
    if (costExceeded) {
      reasonParts.push(
        `cost pressure ${input.pressure.costPressureRatio.toFixed(4)} >= ${costThreshold.toFixed(4)}`,
      );
    }
    if (errorExceeded) {
      reasonParts.push(
        `error pressure ${input.pressure.errorPressureRatio.toFixed(4)} >= ${errorThreshold.toFixed(4)}`,
      );
    }

    return {
      allowed: routeAction === "degrade",
      degraded: routeAction === "degrade",
      routeAction,
      reasonCode: "pressure_threshold_exceeded",
      reason: reasonParts.join("; "),
      maxParallelRuns,
      maxRetryAttempts,
      activeRuns,
      retryAttempt,
      costThreshold,
      errorThreshold,
      pressure: input.pressure,
    };
  }

  return {
    allowed: true,
    degraded: false,
    routeAction: null,
    reasonCode: "ok",
    reason: null,
    maxParallelRuns,
    maxRetryAttempts,
    activeRuns,
    retryAttempt,
    costThreshold,
    errorThreshold,
    pressure: input.pressure,
  };
}

async function countActiveRunsByScope(input: {
  db: Db;
  companyId: string;
  policyScope: AdapterExecutionPolicyScope;
  roleKey: string | null;
  projectId: string | null;
  excludeRunId?: string | null;
}): Promise<number> {
  if (input.policyScope === "role" && input.roleKey) {
    const [row] = await input.db
      .select({ count: sql<number>`count(*)` })
      .from(heartbeatRuns)
      .innerJoin(agents, eq(heartbeatRuns.agentId, agents.id))
      .where(
        and(
          eq(heartbeatRuns.companyId, input.companyId),
          inArray(heartbeatRuns.status, ACTIVE_RUN_STATUSES),
          eq(agents.roleKey, input.roleKey),
          ...(input.excludeRunId ? [sql`${heartbeatRuns.id} <> ${input.excludeRunId}`] : []),
        ),
      );
    return Number(row?.count ?? 0);
  }

  if (input.policyScope === "project" && input.projectId) {
    const [row] = await input.db
      .select({ count: sql<number>`count(*)` })
      .from(heartbeatRuns)
      .where(
        and(
          eq(heartbeatRuns.companyId, input.companyId),
          inArray(heartbeatRuns.status, ACTIVE_RUN_STATUSES),
          sql`${heartbeatRuns.contextSnapshot} ->> 'projectId' = ${input.projectId}`,
          ...(input.excludeRunId ? [sql`${heartbeatRuns.id} <> ${input.excludeRunId}`] : []),
        ),
      );
    return Number(row?.count ?? 0);
  }

  const [row] = await input.db
    .select({ count: sql<number>`count(*)` })
    .from(heartbeatRuns)
    .where(
      and(
        eq(heartbeatRuns.companyId, input.companyId),
        inArray(heartbeatRuns.status, ACTIVE_RUN_STATUSES),
        ...(input.excludeRunId ? [sql`${heartbeatRuns.id} <> ${input.excludeRunId}`] : []),
      ),
    );
  return Number(row?.count ?? 0);
}

async function loadPressureSnapshot(input: {
  db: Db;
  companyId: string;
  policyScope: AdapterExecutionPolicyScope;
  roleKey: string | null;
  projectId: string | null;
}): Promise<AdapterPolicyPressureSnapshot> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const errorWindowStart = new Date(now.getTime() - ERROR_PRESSURE_LOOKBACK_HOURS * 60 * 60 * 1000);

  const company = await input.db
    .select({ budgetMonthlyCents: companies.budgetMonthlyCents })
    .from(companies)
    .where(eq(companies.id, input.companyId))
    .then((rows) => rows[0] ?? null);
  const monthBudgetCents = Number(company?.budgetMonthlyCents ?? 0);

  const [monthSpendRow] = await input.db
    .select({ spendCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)::int` })
    .from(costEvents)
    .where(
      and(
        eq(costEvents.companyId, input.companyId),
        gte(costEvents.occurredAt, monthStart),
      ),
    );
  const monthSpendCents = Number(monthSpendRow?.spendCents ?? 0);

  let totalRuns = 0;
  let failedRuns = 0;
  if (input.policyScope === "role" && input.roleKey) {
    const [row] = await input.db
      .select({
        totalRuns: sql<number>`count(*)`,
        failedRuns: sql<number>`coalesce(sum(case when ${telemetryRecords.status} = 'succeeded' then 0 else 1 end), 0)::int`,
      })
      .from(telemetryRecords)
      .innerJoin(agents, eq(telemetryRecords.executionAgentId, agents.id))
      .where(
        and(
          eq(telemetryRecords.companyId, input.companyId),
          gte(telemetryRecords.createdAt, errorWindowStart),
          eq(agents.roleKey, input.roleKey),
        ),
      );
    totalRuns = Number(row?.totalRuns ?? 0);
    failedRuns = Number(row?.failedRuns ?? 0);
  } else if (input.policyScope === "project" && input.projectId) {
    const [row] = await input.db
      .select({
        totalRuns: sql<number>`count(*)`,
        failedRuns: sql<number>`coalesce(sum(case when ${telemetryRecords.status} = 'succeeded' then 0 else 1 end), 0)::int`,
      })
      .from(telemetryRecords)
      .innerJoin(issues, eq(telemetryRecords.issueId, issues.id))
      .where(
        and(
          eq(telemetryRecords.companyId, input.companyId),
          gte(telemetryRecords.createdAt, errorWindowStart),
          eq(issues.projectId, input.projectId),
        ),
      );
    totalRuns = Number(row?.totalRuns ?? 0);
    failedRuns = Number(row?.failedRuns ?? 0);
  } else {
    const [row] = await input.db
      .select({
        totalRuns: sql<number>`count(*)`,
        failedRuns: sql<number>`coalesce(sum(case when ${telemetryRecords.status} = 'succeeded' then 0 else 1 end), 0)::int`,
      })
      .from(telemetryRecords)
      .where(
        and(
          eq(telemetryRecords.companyId, input.companyId),
          gte(telemetryRecords.createdAt, errorWindowStart),
        ),
      );
    totalRuns = Number(row?.totalRuns ?? 0);
    failedRuns = Number(row?.failedRuns ?? 0);
  }

  return {
    monthSpendCents,
    monthBudgetCents,
    costPressureRatio: safeRatio(monthSpendCents, monthBudgetCents),
    errorPressureRatio: safeRatio(failedRuns, totalRuns),
  };
}

export function adapterPolicyService(db: Db) {
  return {
    getActiveToolContract: async (input: {
      companyId: string;
      adapterType: string;
      toolName: string;
    }): Promise<ResolvedAdapterToolContract> => {
      const record = await db
        .select()
        .from(adapterToolContracts)
        .where(
          and(
            eq(adapterToolContracts.companyId, input.companyId),
            eq(adapterToolContracts.adapterType, input.adapterType),
            eq(adapterToolContracts.toolName, input.toolName),
            eq(adapterToolContracts.status, "active"),
          ),
        )
        .orderBy(desc(adapterToolContracts.updatedAt), desc(adapterToolContracts.version))
        .limit(1)
        .then((rows) => rows[0] ?? null);

      if (!record) {
        throw unprocessable("Active adapter tool contract required before execution", {
          companyId: input.companyId,
          adapterType: input.adapterType,
          toolName: input.toolName,
          requiredAction: "seed_or_create_adapter_tool_contract",
        });
      }
      return {
        ...record,
        determinismLevel: normalizeDeterminismLevel(record.determinismLevel),
        status: normalizeToolContractStatus(record.status),
        source: "db",
      };
    },

    resolveExecutionPolicy: async (input: {
      companyId: string;
      roleKey: string | null;
      projectId: string | null;
    }): Promise<AdapterExecutionPolicyRow | null> => {
      const rows = await db
        .select()
        .from(adapterExecutionPolicies)
        .where(eq(adapterExecutionPolicies.companyId, input.companyId));

      return selectApplicableExecutionPolicy({
        policies: rows,
        companyId: input.companyId,
        roleKey: input.roleKey,
        projectId: input.projectId,
      });
    },

    evaluateRunGate: async (input: {
      companyId: string;
      roleKey: string | null;
      projectId: string | null;
      retryAttempt: number;
      excludeRunId?: string | null;
    }): Promise<AdapterPolicyGateResult> => {
      const resolved = await db
        .select()
        .from(adapterExecutionPolicies)
        .where(eq(adapterExecutionPolicies.companyId, input.companyId));
      const matched = selectApplicableExecutionPolicy({
        policies: resolved,
        companyId: input.companyId,
        roleKey: input.roleKey,
        projectId: input.projectId,
      });
      const policy = normalizePolicyRecord(matched ?? buildDefaultPolicy(input.companyId));
      const pressure = await loadPressureSnapshot({
        db,
        companyId: input.companyId,
        policyScope: normalizePolicyScope(policy.policyScope),
        roleKey: normalizeNullableRoleKey(policy.roleKey),
        projectId: normalizeNullableProjectId(policy.projectId),
      });
      const activeRuns = await countActiveRunsByScope({
        db,
        companyId: input.companyId,
        policyScope: normalizePolicyScope(policy.policyScope),
        roleKey: normalizeNullableRoleKey(policy.roleKey),
        projectId: normalizeNullableProjectId(policy.projectId),
        excludeRunId: input.excludeRunId ?? null,
      });

      const decision = evaluatePolicyGate({
        policy,
        activeRuns,
        retryAttempt: Math.max(0, Math.floor(input.retryAttempt)),
        pressure,
      });

      return {
        policy,
        policyMatchedFromDb: Boolean(matched),
        decision,
      };
    },
  };
}