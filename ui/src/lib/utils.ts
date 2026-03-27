import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { deriveAgentUrlKey, deriveProjectUrlKey } from "@paperclipai/shared";
import type { BillingType, FinanceDirection, FinanceEventKind } from "@paperclipai/shared";
import {
  formatCurrencyFromCents,
  formatLocaleDate,
  formatLocaleDateTime,
  formatRelativeTimeFromNow,
  getCurrentLanguage,
} from "./locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCents(cents: number): string {
  return formatCurrencyFromCents(cents);
}

export function formatDate(date: Date | string): string {
  return formatLocaleDate(date);
}

export function formatDateTime(date: Date | string): string {
  return formatLocaleDateTime(date);
}

export function relativeTime(date: Date | string): string {
  return formatRelativeTimeFromNow(date);
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/** Map a raw provider slug to a display-friendly name. */
export function providerDisplayName(provider: string): string {
  const map: Record<string, string> = {
    anthropic: "Anthropic",
    openai: "OpenAI",
    openrouter: "OpenRouter",
    chatgpt: "ChatGPT",
    google: "Google",
    cursor: "Cursor",
    jetbrains: "JetBrains AI",
  };
  return map[provider.toLowerCase()] ?? provider;
}

export function billingTypeDisplayName(billingType: BillingType): string {
  const isPt = getCurrentLanguage() === "pt-BR";
  const map: Record<BillingType, string> = {
    metered_api: "Metered API",
    subscription_included: isPt ? "Assinatura" : "Subscription",
    subscription_overage: isPt ? "Excedente da assinatura" : "Subscription overage",
    credits: isPt ? "Creditos" : "Credits",
    fixed: isPt ? "Fixo" : "Fixed",
    unknown: isPt ? "Desconhecido" : "Unknown",
  };
  return map[billingType];
}

export function quotaSourceDisplayName(source: string): string {
  const map: Record<string, string> = {
    "anthropic-oauth": "Anthropic OAuth",
    "claude-cli": "Claude CLI",
    "codex-rpc": "Codex app server",
    "codex-wham": "ChatGPT WHAM",
  };
  return map[source] ?? source;
}

function coerceBillingType(value: unknown): BillingType | null {
  if (
    value === "metered_api" ||
    value === "subscription_included" ||
    value === "subscription_overage" ||
    value === "credits" ||
    value === "fixed" ||
    value === "unknown"
  ) {
    return value;
  }
  return null;
}

function readRunCostUsd(payload: Record<string, unknown> | null): number {
  if (!payload) return 0;
  for (const key of ["costUsd", "cost_usd", "total_cost_usd"] as const) {
    const value = payload[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
}

export function visibleRunCostUsd(
  usage: Record<string, unknown> | null,
  result: Record<string, unknown> | null = null,
): number {
  const billingType = coerceBillingType(usage?.billingType) ?? coerceBillingType(result?.billingType);
  if (billingType === "subscription_included") return 0;
  return readRunCostUsd(usage) || readRunCostUsd(result);
}

export function financeEventKindDisplayName(eventKind: FinanceEventKind): string {
  const isPt = getCurrentLanguage() === "pt-BR";
  const map: Record<FinanceEventKind, string> = {
    inference_charge: "Inference charge",
    platform_fee: isPt ? "Taxa da plataforma" : "Platform fee",
    credit_purchase: isPt ? "Compra de creditos" : "Credit purchase",
    credit_refund: isPt ? "Reembolso de creditos" : "Credit refund",
    credit_expiry: isPt ? "Expiracao de creditos" : "Credit expiry",
    byok_fee: "BYOK fee",
    gateway_overhead: isPt ? "Sobrecarga do gateway" : "Gateway overhead",
    log_storage_charge: isPt ? "Armazenamento de logs" : "Log storage",
    logpush_charge: "Logpush",
    provisioned_capacity_charge: isPt ? "Capacidade provisionada" : "Provisioned capacity",
    training_charge: isPt ? "Treinamento" : "Training",
    custom_model_import_charge: isPt ? "Importacao de modelo customizado" : "Custom model import",
    custom_model_storage_charge: isPt ? "Armazenamento de modelo customizado" : "Custom model storage",
    manual_adjustment: isPt ? "Ajuste manual" : "Manual adjustment",
  };
  return map[eventKind];
}

export function financeDirectionDisplayName(direction: FinanceDirection): string {
  const isPt = getCurrentLanguage() === "pt-BR";
  return direction === "credit"
    ? (isPt ? "Credito" : "Credit")
    : (isPt ? "Debito" : "Debit");
}

/** Build an issue URL using the human-readable identifier when available. */
export function issueUrl(issue: { id: string; identifier?: string | null }): string {
  return `/issues/${issue.identifier ?? issue.id}`;
}

/** Build an agent route URL using the short URL key when available. */
export function agentRouteRef(agent: { id: string; urlKey?: string | null; name?: string | null }): string {
  return agent.urlKey ?? deriveAgentUrlKey(agent.name, agent.id);
}

/** Build an agent URL using the short URL key when available. */
export function agentUrl(agent: { id: string; urlKey?: string | null; name?: string | null }): string {
  return `/agents/${agentRouteRef(agent)}`;
}

/** Build a project route reference using the short URL key when available. */
export function projectRouteRef(project: { id: string; urlKey?: string | null; name?: string | null }): string {
  return project.urlKey ?? deriveProjectUrlKey(project.name, project.id);
}

/** Build a project URL using the short URL key when available. */
export function projectUrl(project: { id: string; urlKey?: string | null; name?: string | null }): string {
  return `/projects/${projectRouteRef(project)}`;
}
