import type {
  AdapterContractDeterminismLevel,
  AdapterErrorClass,
  AdapterExecutionPolicyScope,
  AdapterPressureRoute,
  AdapterRetryClass,
  AdapterToolContractStatus,
} from "../constants.js";

export interface AdapterToolContract {
  id: string;
  companyId: string;
  adapterType: string;
  toolName: string;
  version: number;
  requestSchemaJson: Record<string, unknown>;
  responseSchemaJson: Record<string, unknown>;
  timeoutMs: number | null;
  retryPolicyJson: Record<string, unknown>;
  determinismLevel: AdapterContractDeterminismLevel;
  status: AdapterToolContractStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdapterExecutionPolicy {
  id: string;
  companyId: string;
  policyScope: AdapterExecutionPolicyScope;
  roleKey: string | null;
  projectId: string | null;
  maxParallelRuns: number;
  maxRetryAttempts: number;
  costPressureThreshold: number;
  errorPressureThreshold: number;
  routeOnPressure: AdapterPressureRoute;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdapterContractValidationResult {
  valid: boolean;
  errors: string[];
}

export interface AdapterPolicyPressureSnapshot {
  costPressureRatio: number;
  errorPressureRatio: number;
  costThreshold: number;
  errorThreshold: number;
}

export interface AdapterPolicyGateDecision {
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
  pressure: AdapterPolicyPressureSnapshot;
}

export interface AdapterTelemetryClassification {
  errorClass: AdapterErrorClass | null;
  retryClass: AdapterRetryClass;
  retryAttempt: number;
}