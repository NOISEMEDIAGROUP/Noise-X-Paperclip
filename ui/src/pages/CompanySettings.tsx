import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { companiesApi } from "../api/companies";
import { accessApi } from "../api/access";
import { secretsApi } from "../api/secrets";
import { agentsApi } from "../api/agents";
import { ApiError } from "../api/client";
import { modelProvidersApi, type DiscoveredModel } from "../api/modelProviders";
import { queryKeys } from "../lib/queryKeys";
import { isAgentCompatibleForProviderKeySync } from "../lib/provider-key-sync";
import { Button } from "@/components/ui/button";
import { KeyRound, Settings } from "lucide-react";
import { CompanyPatternIcon } from "../components/CompanyPatternIcon";
import { Field, ToggleField, HintIcon } from "../components/agent-config-primitives";
import type { Agent, CompanySecret, EnvBinding } from "@paperclipai/shared";

type ProviderId = "openai" | "anthropic" | "alibaba" | "groq" | "xai" | "minimax";

type ProviderConfig = {
  id: ProviderId;
  label: string;
  secretName: string;
  envVars: string[];
  defaultModelBaseUrl: string | null;
  supportsModelRouting: boolean;
  modelAdapterTypes: Array<"process" | "codex_local">;
  hint: string;
};

type ProviderModelState = {
  models: DiscoveredModel[];
  endpoint: string | null;
  baseUrl: string | null;
  validatedModel: string | null;
  detectedAt: string | null;
  error: string | null;
};

const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    id: "openai",
    label: "OpenAI",
    secretName: "provider-openai-api-key",
    envVars: ["OPENAI_API_KEY"],
    defaultModelBaseUrl: "https://api.openai.com/v1",
    supportsModelRouting: true,
    modelAdapterTypes: ["process", "codex_local"],
    hint: "Used by codex_local agents and OpenAI adapters.",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    secretName: "provider-anthropic-api-key",
    envVars: ["ANTHROPIC_API_KEY"],
    defaultModelBaseUrl: null,
    supportsModelRouting: false,
    modelAdapterTypes: [],
    hint: "Used by claude_local agents.",
  },
  {
    id: "alibaba",
    label: "Alibaba DashScope",
    secretName: "provider-alibaba-api-key",
    envVars: ["ALIBABA_API_KEY", "DASHSCOPE_API_KEY"],
    defaultModelBaseUrl: "https://coding-intl.dashscope.aliyuncs.com/v1",
    supportsModelRouting: true,
    modelAdapterTypes: ["process"],
    hint: "Use for Model Studio Coding Plan (OpenAI-compatible) and DashScope workers.",
  },
  {
    id: "groq",
    label: "Groq",
    secretName: "provider-groq-api-key",
    envVars: ["GROQ_API_KEY"],
    defaultModelBaseUrl: "https://api.groq.com/openai/v1",
    supportsModelRouting: true,
    modelAdapterTypes: ["process"],
    hint: "Use for Groq-hosted OpenAI-compatible models.",
  },
  {
    id: "xai",
    label: "xAI",
    secretName: "provider-xai-api-key",
    envVars: ["XAI_API_KEY"],
    defaultModelBaseUrl: "https://api.x.ai/v1",
    supportsModelRouting: true,
    modelAdapterTypes: ["process"],
    hint: "Use for xAI model integrations.",
  },
  {
    id: "minimax",
    label: "MiniMax",
    secretName: "provider-minimax-api-key",
    envVars: ["MINIMAX_API_KEY"],
    defaultModelBaseUrl: "https://api.minimax.chat/v1",
    supportsModelRouting: true,
    modelAdapterTypes: ["process"],
    hint: "Use for MiniMax integrations.",
  },
];

function asEnvRecord(value: unknown): Record<string, EnvBinding> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, EnvBinding>;
}

function buildProviderInputState(): Record<ProviderId, string> {
  return PROVIDER_CONFIGS.reduce((acc, provider) => {
    acc[provider.id] = "";
    return acc;
  }, {} as Record<ProviderId, string>);
}

function buildProviderModelState(): Record<ProviderId, ProviderModelState> {
  return PROVIDER_CONFIGS.reduce((acc, provider) => {
    acc[provider.id] = {
      models: [],
      endpoint: null,
      baseUrl: null,
      validatedModel: null,
      detectedAt: null,
      error: null,
    };
    return acc;
  }, {} as Record<ProviderId, ProviderModelState>);
}

function buildProviderBooleanState(initial = false): Record<ProviderId, boolean> {
  return PROVIDER_CONFIGS.reduce((acc, provider) => {
    acc[provider.id] = initial;
    return acc;
  }, {} as Record<ProviderId, boolean>);
}

function buildProviderStringState(): Record<ProviderId, string> {
  return PROVIDER_CONFIGS.reduce((acc, provider) => {
    acc[provider.id] = "";
    return acc;
  }, {} as Record<ProviderId, string>);
}

function formatModelDiscoveryError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : "Failed to detect models";
  }

  const body = error.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return error.message;
  }

  const record = body as Record<string, unknown>;
  const attempts = Array.isArray(record.attempts)
    ? record.attempts
        .map((attempt) => {
          if (!attempt || typeof attempt !== "object" || Array.isArray(attempt)) return null;
          const attemptRecord = attempt as Record<string, unknown>;
          const endpoint =
            typeof attemptRecord.endpoint === "string" && attemptRecord.endpoint.length > 0
              ? attemptRecord.endpoint
              : "endpoint";
          const status =
            typeof attemptRecord.status === "number" ? String(attemptRecord.status) : "error";
          const detail =
            typeof attemptRecord.error === "string" && attemptRecord.error.length > 0
              ? attemptRecord.error
              : "request failed";
          return `${endpoint} (${status}): ${detail}`;
        })
        .filter((item): item is string => Boolean(item))
    : [];

  if (attempts.length === 0) {
    return error.message;
  }

  return `${error.message} | ${attempts.join(" | ")}`;
}

export function CompanySettings() {
  const { companies, selectedCompany, selectedCompanyId, setSelectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();

  // General settings local state
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [brandColor, setBrandColor] = useState("");

  // Sync local state from selected company
  useEffect(() => {
    if (!selectedCompany) return;
    setCompanyName(selectedCompany.name);
    setDescription(selectedCompany.description ?? "");
    setBrandColor(selectedCompany.brandColor ?? "");
  }, [selectedCompany]);

  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [providerInputs, setProviderInputs] = useState<Record<ProviderId, string>>(buildProviderInputState);
  const [selectedModelByProvider, setSelectedModelByProvider] = useState<Record<ProviderId, string>>(
    buildProviderInputState,
  );
  const [providerModelState, setProviderModelState] = useState<Record<ProviderId, ProviderModelState>>(
    buildProviderModelState,
  );
  const [canaryRolloutByProvider, setCanaryRolloutByProvider] = useState<Record<ProviderId, boolean>>(
    () => buildProviderBooleanState(false),
  );
  const [overrideModelProfilesByProvider, setOverrideModelProfilesByProvider] = useState<Record<ProviderId, boolean>>(
    () => buildProviderBooleanState(false),
  );
  const [canaryAgentByProvider, setCanaryAgentByProvider] = useState<Record<ProviderId, string>>(
    buildProviderStringState,
  );
  const [pendingCanaryTargetsByProvider, setPendingCanaryTargetsByProvider] = useState<Record<ProviderId, string[]>>(
    () => PROVIDER_CONFIGS.reduce((acc, provider) => {
      acc[provider.id] = [];
      return acc;
    }, {} as Record<ProviderId, string[]>),
  );
  const [autoApplyProviderKey, setAutoApplyProviderKey] = useState(true);
  const [providerActionMessage, setProviderActionMessage] = useState<string | null>(null);
  const [providerActionError, setProviderActionError] = useState<string | null>(null);

  const agentsQuery = useQuery({
    queryKey: selectedCompanyId ? queryKeys.agents.list(selectedCompanyId) : ["agents", "none"],
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  const readinessQuery = useQuery({
    queryKey: selectedCompanyId ? ["agents", "readiness", selectedCompanyId] : ["agents", "readiness", "none"],
    queryFn: () => agentsApi.readiness(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
    refetchInterval: 30_000,
  });

  const secretsQuery = useQuery({
    queryKey: selectedCompanyId ? queryKeys.secrets.list(selectedCompanyId) : ["secrets", "none"],
    queryFn: () => secretsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  const providerSecretByName = useMemo(() => {
    const map = new Map<string, CompanySecret>();
    for (const secret of secretsQuery.data ?? []) {
      map.set(secret.name, secret);
    }
    return map;
  }, [secretsQuery.data]);

  const applyProviderToAgentsMutation = useMutation({
    mutationFn: async ({
      provider,
      secret,
    }: {
      provider: ProviderConfig;
      secret: CompanySecret;
    }) => {
      const agents = await agentsApi.list(selectedCompanyId!);
      const activeAgents = agents.filter((agent) => agent.status !== "terminated");
      const compatibleAgents = activeAgents.filter((agent) =>
        isAgentCompatibleForProviderKeySync(agent, provider),
      );
      const refBinding: EnvBinding = { type: "secret_ref", secretId: secret.id, version: "latest" };

      await Promise.all(
        compatibleAgents.map(async (agent: Agent) => {
          const config = { ...((agent.adapterConfig ?? {}) as Record<string, unknown>) };
          const env = { ...asEnvRecord(config.env) };
          for (const envVar of provider.envVars) {
            env[envVar] = refBinding;
          }
          await agentsApi.update(
            agent.id,
            {
              adapterConfig: {
                ...config,
                env,
              },
            },
            selectedCompanyId!,
          );
        }),
      );

      return {
        updated: compatibleAgents.length,
        skippedIncompatible: activeAgents.length - compatibleAgents.length,
      };
    },
    onSuccess: ({ updated, skippedIncompatible }, variables) => {
      setProviderActionError(null);
      setProviderActionMessage(
        `${variables.provider.label} key synced to ${updated} compatible agent${updated === 1 ? "" : "s"} (${variables.provider.envVars.join(", ")}).${skippedIncompatible > 0 ? ` Skipped ${skippedIncompatible} incompatible agent${skippedIncompatible === 1 ? "" : "s"}.` : ""}`,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(selectedCompanyId!) });
    },
    onError: (err) => {
      setProviderActionMessage(null);
      setProviderActionError(err instanceof Error ? err.message : "Failed to sync provider key to agents");
    },
  });

  const saveProviderKeyMutation = useMutation({
    mutationFn: async ({ provider, value }: { provider: ProviderConfig; value: string }) => {
      const existing = providerSecretByName.get(provider.secretName);
      if (existing) {
        return secretsApi.rotate(existing.id, { value });
      }
      return secretsApi.create(selectedCompanyId!, {
        name: provider.secretName,
        value,
        description: `${provider.label} API key (managed from company settings)`,
      });
    },
    onSuccess: async (secret, variables) => {
      setProviderActionError(null);
      setProviderActionMessage(`${variables.provider.label} key saved successfully.`);
      setProviderInputs((prev) => ({ ...prev, [variables.provider.id]: "" }));
      await queryClient.invalidateQueries({ queryKey: queryKeys.secrets.list(selectedCompanyId!) });
      if (autoApplyProviderKey) {
        applyProviderToAgentsMutation.mutate({ provider: variables.provider, secret });
      }
    },
    onError: (err) => {
      setProviderActionMessage(null);
      setProviderActionError(err instanceof Error ? err.message : "Failed to save provider key");
    },
  });

  const discoverProviderModelsMutation = useMutation({
    mutationFn: async ({ provider, model }: { provider: ProviderConfig; model?: string }) =>
      modelProvidersApi.discoverModels(selectedCompanyId!, provider.id, { model }),
    onSuccess: (result, variables) => {
      const provider = variables.provider;
      setProviderModelState((prev) => ({
        ...prev,
        [provider.id]: {
          models: result.models,
          endpoint: result.endpoint,
          baseUrl:
            (typeof result.baseUrl === "string" && result.baseUrl.trim().length > 0
              ? result.baseUrl.trim()
              : result.endpoint.replace(/\/models\/?$/, "")) || null,
          validatedModel:
            typeof result.validatedModel === "string" && result.validatedModel.trim().length > 0
              ? result.validatedModel.trim()
              : null,
          detectedAt: result.detectedAt,
          error: null,
        },
      }));
      setSelectedModelByProvider((prev) => ({
        ...prev,
        [provider.id]: prev[provider.id] || result.models[0]?.id || "",
      }));
      setProviderActionError(null);
      setProviderActionMessage(
        `${provider.label}: detected ${result.models.length} model${result.models.length === 1 ? "" : "s"}.`,
      );
    },
    onError: (err, variables) => {
      const provider = variables.provider;
      const message = formatModelDiscoveryError(err);
      setProviderModelState((prev) => ({
        ...prev,
        [provider.id]: {
          ...prev[provider.id],
          error: message,
        },
      }));
      setProviderActionMessage(null);
      setProviderActionError(`${provider.label}: ${message}`);
    },
  });

  const applyProviderModelToAgentsMutation = useMutation({
    mutationFn: async ({
      provider,
      modelId,
      canaryAgentId,
      overrideProfileTuning,
      targetAgentIds,
    }: {
      provider: ProviderConfig;
      modelId: string;
      canaryAgentId?: string;
      overrideProfileTuning?: boolean;
      targetAgentIds?: string[];
    }) => {
      const modelState = providerModelState[provider.id];
      const baseUrl = modelState.baseUrl ?? provider.defaultModelBaseUrl;

      if (!baseUrl) {
        throw new Error(`No base URL available for ${provider.label}`);
      }

      const secret = providerSecretByName.get(provider.secretName);
      if (!secret) {
        throw new Error(`No saved secret for ${provider.label}. Save key ${provider.secretName} first.`);
      }

      const agents = await agentsApi.list(selectedCompanyId!);
      const compatibleAgents = agents.filter(
        (agent) =>
          agent.status !== "terminated" &&
          provider.modelAdapterTypes.includes(agent.adapterType as "process" | "codex_local"),
      );

      const baseTargetAgents = targetAgentIds && targetAgentIds.length > 0
        ? compatibleAgents.filter((agent) => targetAgentIds.includes(agent.id))
        : canaryAgentId
          ? compatibleAgents.filter((agent) => agent.id === canaryAgentId)
          : compatibleAgents;

      const skippedProfileTuned: string[] = [];
      const targetAgents = baseTargetAgents.filter((agent) => {
        if (overrideProfileTuning) return true;
        const config = (agent.adapterConfig ?? {}) as Record<string, unknown>;
        const profileId = typeof config.modelProfileId === "string" ? config.modelProfileId.trim() : "";
        if (!profileId) return true;
        skippedProfileTuned.push(agent.id);
        return false;
      });

      const byAdapter: Record<string, number> = {};
      const refBinding: EnvBinding = { type: "secret_ref", secretId: secret.id, version: "latest" };

      await Promise.all(
        targetAgents.map(async (agent) => {
          const config = { ...((agent.adapterConfig ?? {}) as Record<string, unknown>) };
          const env = { ...asEnvRecord(config.env) };

          for (const envVar of provider.envVars) {
            env[envVar] = refBinding;
          }

          const nextConfig: Record<string, unknown> = {
            ...config,
            env,
          };

          if (agent.adapterType === "process") {
            env.MODEL_PROVIDER = { type: "plain", value: provider.id };
            env.MODEL_BASE_URL = { type: "plain", value: baseUrl };
            env.MODEL_NAME = { type: "plain", value: modelId };
          }

          if (agent.adapterType === "codex_local") {
            const providerKeyEnv = provider.envVars[0] || "OPENAI_API_KEY";
            env.OPENAI_API_KEY = refBinding;
            env.OPENAI_BASE_URL = { type: "plain", value: baseUrl };
            nextConfig.model = modelId;
            nextConfig.modelProvider = provider.id;
            nextConfig.modelBaseUrl = baseUrl;
            nextConfig.modelApiKeyEnv = providerKeyEnv;
          }

          await agentsApi.update(
            agent.id,
            {
              adapterConfig: nextConfig,
            },
            selectedCompanyId!,
          );

          byAdapter[agent.adapterType] = (byAdapter[agent.adapterType] ?? 0) + 1;
        }),
      );

      const remainingAfterCanary = canaryAgentId
        ? compatibleAgents
            .filter((agent) => agent.id !== canaryAgentId)
            .filter((agent) =>
              overrideProfileTuning
                ? true
                : !(
                    typeof (agent.adapterConfig as Record<string, unknown> | null | undefined)?.modelProfileId === "string" &&
                    String((agent.adapterConfig as Record<string, unknown>).modelProfileId).trim().length > 0
                  ),
            )
            .map((agent) => agent.id)
        : [];

      return {
        updated: targetAgents.length,
        baseUrl,
        byAdapter,
        skippedProfileTuned: skippedProfileTuned.length,
        remainingAfterCanary,
      };
    },
    onSuccess: ({ updated, byAdapter, skippedProfileTuned, remainingAfterCanary }, variables) => {
      setProviderActionError(null);
      const byAdapterText = Object.entries(byAdapter)
        .map(([adapter, count]) => `${count} ${adapter}`)
        .join(", ");
      const skippedText = skippedProfileTuned > 0 ? ` Skipped ${skippedProfileTuned} profile-tuned agent${skippedProfileTuned === 1 ? "" : "s"}.` : "";
      const canaryText = remainingAfterCanary.length > 0
        ? ` Canary applied. ${remainingAfterCanary.length} compatible agent${remainingAfterCanary.length === 1 ? "" : "s"} ready for expansion.`
        : "";
      setProviderActionMessage(
        `${variables.provider.label} model "${variables.modelId}" synced to ${updated} compatible agent${updated === 1 ? "" : "s"}${byAdapterText ? ` (${byAdapterText})` : ""}.${skippedText}${canaryText}`,
      );
      setPendingCanaryTargetsByProvider((prev) => ({
        ...prev,
        [variables.provider.id]: remainingAfterCanary,
      }));
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(selectedCompanyId!) });
      queryClient.invalidateQueries({ queryKey: ["agents", "readiness", selectedCompanyId!] });
    },
    onError: (err) => {
      setProviderActionMessage(null);
      setProviderActionError(
        err instanceof Error ? err.message : "Failed to sync model to compatible agents",
      );
    },
  });

  const generalDirty =
    !!selectedCompany &&
    (companyName !== selectedCompany.name ||
      description !== (selectedCompany.description ?? "") ||
      brandColor !== (selectedCompany.brandColor ?? ""));

  const generalMutation = useMutation({
    mutationFn: (data: { name: string; description: string | null; brandColor: string | null }) =>
      companiesApi.update(selectedCompanyId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    },
  });

  const settingsMutation = useMutation({
    mutationFn: (requireApproval: boolean) =>
      companiesApi.update(selectedCompanyId!, {
        requireBoardApprovalForNewAgents: requireApproval,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      accessApi.createCompanyInvite(selectedCompanyId!, {
        allowedJoinTypes: "both",
        expiresInHours: 72,
      }),
    onSuccess: (invite) => {
      setInviteError(null);
      const base = window.location.origin.replace(/\/+$/, "");
      const absoluteUrl = invite.inviteUrl.startsWith("http")
        ? invite.inviteUrl
        : `${base}${invite.inviteUrl}`;
      setInviteLink(absoluteUrl);
      queryClient.invalidateQueries({ queryKey: queryKeys.sidebarBadges(selectedCompanyId!) });
    },
    onError: (err) => {
      setInviteError(err instanceof Error ? err.message : "Failed to create invite");
    },
  });
  const archiveMutation = useMutation({
    mutationFn: ({
      companyId,
      nextCompanyId,
    }: {
      companyId: string;
      nextCompanyId: string | null;
    }) => companiesApi.archive(companyId).then(() => ({ nextCompanyId })),
    onSuccess: async ({ nextCompanyId }) => {
      if (nextCompanyId) {
        setSelectedCompanyId(nextCompanyId);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies.stats });
    },
  });

  useEffect(() => {
    setBreadcrumbs([
      { label: selectedCompany?.name ?? "Company", href: "/dashboard" },
      { label: "Settings" },
    ]);
  }, [setBreadcrumbs, selectedCompany?.name]);

  if (!selectedCompany) {
    return (
      <div className="text-sm text-muted-foreground">
        No company selected. Select a company from the switcher above.
      </div>
    );
  }

  function handleSaveGeneral() {
    generalMutation.mutate({
      name: companyName.trim(),
      description: description.trim() || null,
      brandColor: brandColor || null,
    });
  }

  function handleProviderInputChange(providerId: ProviderId, value: string) {
    setProviderInputs((prev) => ({ ...prev, [providerId]: value }));
  }

  function handleSaveProviderKey(provider: ProviderConfig) {
    const value = providerInputs[provider.id].trim();
    if (!value) {
      setProviderActionMessage(null);
      setProviderActionError(`Enter a value for ${provider.label} before saving.`);
      return;
    }
    saveProviderKeyMutation.mutate({ provider, value });
  }

  function handleApplyProviderKey(provider: ProviderConfig) {
    const secret = providerSecretByName.get(provider.secretName);
    if (!secret) {
      setProviderActionMessage(null);
      setProviderActionError(`No saved secret for ${provider.label}. Save the key first.`);
      return;
    }
    applyProviderToAgentsMutation.mutate({ provider, secret });
  }

  function handleDetectProviderModels(provider: ProviderConfig) {
    const requestedModel = selectedModelByProvider[provider.id]?.trim() || undefined;
    setProviderModelState((prev) => ({
      ...prev,
      [provider.id]: {
        ...prev[provider.id],
        error: null,
      },
    }));
    discoverProviderModelsMutation.mutate({ provider, model: requestedModel });
  }

  function handleSelectProviderModel(providerId: ProviderId, modelId: string) {
    setSelectedModelByProvider((prev) => ({
      ...prev,
      [providerId]: modelId,
    }));
  }

  function computeModelRolloutPreview(provider: ProviderConfig) {
    const agents = agentsQuery.data ?? [];
    const compatible = agents.filter(
      (agent) =>
        agent.status !== "terminated" &&
        provider.modelAdapterTypes.includes(agent.adapterType as "process" | "codex_local"),
    );
    const protectedByProfile = compatible.filter((agent) => {
      const config = (agent.adapterConfig ?? {}) as Record<string, unknown>;
      const profileId = typeof config.modelProfileId === "string" ? config.modelProfileId.trim() : "";
      return profileId.length > 0;
    });
    const canaryAgentId = canaryAgentByProvider[provider.id];
    const canarySelected = compatible.some((agent) => agent.id === canaryAgentId);
    return {
      compatible,
      protectedByProfile,
      canaryAgentId,
      canarySelected,
      canaryCandidates: compatible,
    };
  }

  function handleToggleCanaryRollout(providerId: ProviderId, checked: boolean) {
    setCanaryRolloutByProvider((prev) => ({ ...prev, [providerId]: checked }));
    if (!checked) {
      setPendingCanaryTargetsByProvider((prev) => ({ ...prev, [providerId]: [] }));
    }
  }

  function handleToggleOverrideProfile(providerId: ProviderId, checked: boolean) {
    setOverrideModelProfilesByProvider((prev) => ({ ...prev, [providerId]: checked }));
  }

  function handleSelectCanaryAgent(providerId: ProviderId, agentId: string) {
    setCanaryAgentByProvider((prev) => ({ ...prev, [providerId]: agentId }));
  }

  function handleApplyProviderModel(provider: ProviderConfig) {
    const modelId = selectedModelByProvider[provider.id]?.trim();
    if (!modelId) {
      setProviderActionMessage(null);
      setProviderActionError(`No selected model for ${provider.label}. Detect models first.`);
      return;
    }

    const canaryEnabled = canaryRolloutByProvider[provider.id];
    const canaryAgentId = canaryEnabled ? canaryAgentByProvider[provider.id] : undefined;
    if (canaryEnabled && !canaryAgentId) {
      setProviderActionMessage(null);
      setProviderActionError(`Select a canary agent for ${provider.label} before applying model.`);
      return;
    }

    applyProviderModelToAgentsMutation.mutate({
      provider,
      modelId,
      canaryAgentId,
      overrideProfileTuning: overrideModelProfilesByProvider[provider.id],
    });
  }

  function handleExpandCanary(provider: ProviderConfig) {
    const pendingTargets = pendingCanaryTargetsByProvider[provider.id] ?? [];
    const modelId = selectedModelByProvider[provider.id]?.trim();
    if (!modelId || pendingTargets.length === 0) return;
    applyProviderModelToAgentsMutation.mutate({
      provider,
      modelId,
      targetAgentIds: pendingTargets,
      overrideProfileTuning: overrideModelProfilesByProvider[provider.id],
    });
    setPendingCanaryTargetsByProvider((prev) => ({ ...prev, [provider.id]: [] }));
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Company Settings</h1>
      </div>

      {/* General */}
      <div className="space-y-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          General
        </div>
        <div className="space-y-3 rounded-md border border-border px-4 py-4">
          <Field label="Company name" hint="The display name for your company.">
            <input
              className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </Field>
          <Field label="Description" hint="Optional description shown in the company profile.">
            <input
              className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
              type="text"
              value={description}
              placeholder="Optional company description"
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* Appearance */}
      <div className="space-y-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Appearance
        </div>
        <div className="space-y-3 rounded-md border border-border px-4 py-4">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <CompanyPatternIcon
                companyName={companyName || selectedCompany.name}
                brandColor={brandColor || null}
                className="rounded-[14px]"
              />
            </div>
            <div className="flex-1 space-y-2">
              <Field label="Brand color" hint="Sets the hue for the company icon. Leave empty for auto-generated color.">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandColor || "#6366f1"}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={brandColor}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^#[0-9a-fA-F]{0,6}$/.test(v)) {
                        setBrandColor(v);
                      }
                    }}
                    placeholder="Auto"
                    className="w-28 rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm font-mono outline-none"
                  />
                  {brandColor && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setBrandColor("")}
                      className="text-xs text-muted-foreground"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </Field>
            </div>
          </div>
        </div>
      </div>

      {/* Save button for General + Appearance */}
      {generalDirty && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSaveGeneral}
            disabled={generalMutation.isPending || !companyName.trim()}
          >
            {generalMutation.isPending ? "Saving..." : "Save changes"}
          </Button>
          {generalMutation.isSuccess && (
            <span className="text-xs text-muted-foreground">Saved</span>
          )}
          {generalMutation.isError && (
            <span className="text-xs text-destructive">
              {generalMutation.error instanceof Error
                ? generalMutation.error.message
                : "Failed to save"}
            </span>
          )}
        </div>
      )}

      {/* Hiring */}
      <div className="space-y-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Hiring
        </div>
        <div className="rounded-md border border-border px-4 py-3">
          <ToggleField
            label="Require board approval for new hires"
            hint="New agent hires stay pending until approved by board."
            checked={!!selectedCompany.requireBoardApprovalForNewAgents}
            onChange={(v) => settingsMutation.mutate(v)}
          />
        </div>
      </div>

      {/* Operational Readiness */}
      <div className="space-y-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Operational Readiness
        </div>
        <div className="space-y-3 rounded-md border border-border px-4 py-4">
          {readinessQuery.isLoading && (
            <p className="text-xs text-muted-foreground">Running readiness checks...</p>
          )}
          {readinessQuery.data && (
            <>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded border border-border/70 px-2 py-1.5">Invalid agents: <span className="font-mono">{readinessQuery.data.summary.invalidAgents}</span></div>
                <div className="rounded border border-border/70 px-2 py-1.5">Errors: <span className="font-mono">{readinessQuery.data.summary.errors}</span></div>
                <div className="rounded border border-border/70 px-2 py-1.5">Warnings: <span className="font-mono">{readinessQuery.data.summary.warnings}</span></div>
                <div className="rounded border border-border/70 px-2 py-1.5">Pending approvals: <span className="font-mono">{readinessQuery.data.pendingApprovals}</span></div>
              </div>

              {readinessQuery.data.summary.invalidAgents > 0 ? (
                <div className="space-y-2">
                  {readinessQuery.data.agents
                    .filter((item) => item.issues.length > 0)
                    .map((item) => (
                      <div key={item.agentId} className="rounded border border-border/70 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <a href={`/agents/${item.agentUrlKey || item.agentId}/configure`} className="text-sm font-medium underline-offset-2 hover:underline">
                            {item.agentName}
                          </a>
                          <span className="text-[11px] text-muted-foreground">{item.adapterType} · {item.status}</span>
                        </div>
                        <ul className="mt-1 space-y-0.5 text-xs">
                          {item.issues.map((issue) => (
                            <li
                              key={`${item.agentId}:${issue.code}`}
                              className={issue.severity === "error" ? "text-destructive" : "text-amber-500"}
                            >
                              {issue.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-500">No blocking readiness issues detected.</p>
              )}
            </>
          )}
          {readinessQuery.isError && (
            <p className="text-xs text-destructive">
              {readinessQuery.error instanceof Error ? readinessQuery.error.message : "Failed to run readiness checks"}
            </p>
          )}
        </div>
      </div>

      {/* AI Provider Keys */}
      <div className="space-y-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          AI Provider Keys
        </div>
        <div className="space-y-3 rounded-md border border-border px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <KeyRound className="h-4 w-4" />
            Save provider API keys once, then sync secret references into every active agent config.
          </div>

          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
            <ToggleField
              label="Auto-sync to all active agents after save"
              hint="When enabled, saving a provider key automatically updates active agent adapter env with secret references."
              checked={autoApplyProviderKey}
              onChange={setAutoApplyProviderKey}
            />
          </div>

          {secretsQuery.isLoading && (
            <p className="text-xs text-muted-foreground">Loading existing secrets...</p>
          )}

          {PROVIDER_CONFIGS.map((provider) => {
            const savedSecret = providerSecretByName.get(provider.secretName);
            const isSaving =
              saveProviderKeyMutation.isPending &&
              saveProviderKeyMutation.variables?.provider.id === provider.id;
            const isApplying =
              applyProviderToAgentsMutation.isPending &&
              applyProviderToAgentsMutation.variables?.provider.id === provider.id;
            const isDetecting =
              discoverProviderModelsMutation.isPending &&
              discoverProviderModelsMutation.variables?.provider.id === provider.id;
            const isApplyingModel =
              applyProviderModelToAgentsMutation.isPending &&
              applyProviderModelToAgentsMutation.variables?.provider.id === provider.id;
            const modelsState = providerModelState[provider.id];
            const selectedModel = selectedModelByProvider[provider.id] ?? "";
            const rolloutPreview = computeModelRolloutPreview(provider);
            const canaryEnabled = canaryRolloutByProvider[provider.id];
            const overrideProfileTuning = overrideModelProfilesByProvider[provider.id];
            const pendingCanaryTargets = pendingCanaryTargetsByProvider[provider.id] ?? [];

            return (
              <div key={provider.id} className="space-y-2 rounded-md border border-border/70 px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{provider.label}</div>
                    <div className="text-xs text-muted-foreground">{provider.hint}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Env: <span className="font-mono">{provider.envVars.join(", ")}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className="min-w-[280px] flex-1 rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
                    type="password"
                    value={providerInputs[provider.id]}
                    placeholder={savedSecret ? "Enter new key to rotate" : "Enter API key"}
                    onChange={(e) => handleProviderInputChange(provider.id, e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSaveProviderKey(provider)}
                    disabled={isSaving || !providerInputs[provider.id].trim()}
                  >
                    {isSaving ? "Saving..." : savedSecret ? "Rotate key" : "Save key"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApplyProviderKey(provider)}
                    disabled={isApplying || !savedSecret}
                  >
                    {isApplying ? "Syncing..." : "Sync to agents"}
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  {savedSecret
                    ? `Configured (v${savedSecret.latestVersion}) as ${savedSecret.name}`
                    : "Not configured yet"}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDetectProviderModels(provider)}
                    disabled={isDetecting || !savedSecret}
                  >
                    {isDetecting ? "Detecting..." : "Detect models"}
                  </Button>

                  {provider.supportsModelRouting && (
                    <>
                      <select
                        className="min-w-[260px] flex-1 rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
                        value={selectedModel}
                        onChange={(e) => handleSelectProviderModel(provider.id, e.target.value)}
                        disabled={modelsState.models.length === 0}
                      >
                        <option value="">
                          {modelsState.models.length > 0
                            ? "Select a model"
                            : "Detect models to choose"}
                        </option>
                        {modelsState.models.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.label} ({model.id})
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApplyProviderModel(provider)}
                        disabled={isApplyingModel || !selectedModel}
                      >
                        {isApplyingModel
                          ? "Applying model..."
                          : canaryEnabled
                            ? "Apply to canary agent"
                            : "Apply model to compatible agents"}
                      </Button>
                      {pendingCanaryTargets.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExpandCanary(provider)}
                          disabled={isApplyingModel}
                        >
                          Expand canary to remaining ({pendingCanaryTargets.length})
                        </Button>
                      )}
                    </>
                  )}
                </div>

                {provider.supportsModelRouting && (
                  <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 space-y-2">
                    <ToggleField
                      label="Canary rollout first"
                      hint="Apply to one agent, validate one run, then expand."
                      checked={canaryEnabled}
                      onChange={(next) => handleToggleCanaryRollout(provider.id, next)}
                    />
                    {canaryEnabled && (
                      <Field label="Canary agent">
                        <select
                          className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
                          value={rolloutPreview.canaryAgentId}
                          onChange={(e) => handleSelectCanaryAgent(provider.id, e.target.value)}
                        >
                          <option value="">Select canary agent</option>
                          {rolloutPreview.canaryCandidates.map((agent) => (
                            <option key={agent.id} value={agent.id}>{agent.name}</option>
                          ))}
                        </select>
                      </Field>
                    )}
                    <ToggleField
                      label="Override per-agent model profiles"
                      hint="Disabled by default to protect role-specific tuning."
                      checked={overrideProfileTuning}
                      onChange={(next) => handleToggleOverrideProfile(provider.id, next)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Preview: {rolloutPreview.compatible.length} compatible, {rolloutPreview.protectedByProfile.length} profile-tuned (protected by default).
                    </p>
                  </div>
                )}

                {modelsState.endpoint && (
                  <div className="text-xs text-muted-foreground">
                    Source endpoint: <span className="font-mono">{modelsState.endpoint}</span>
                  </div>
                )}
                {modelsState.baseUrl && (
                  <div className="text-xs text-muted-foreground">
                    Resolved base URL: <span className="font-mono">{modelsState.baseUrl}</span>
                  </div>
                )}
                {modelsState.models.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Detected {modelsState.models.length} model{modelsState.models.length === 1 ? "" : "s"}
                    {modelsState.detectedAt ? ` at ${new Date(modelsState.detectedAt).toLocaleTimeString()}` : ""}
                  </div>
                )}
                {modelsState.validatedModel && (
                  <div className="text-xs text-muted-foreground">
                    Validated model: <span className="font-mono">{modelsState.validatedModel}</span>
                  </div>
                )}
                {modelsState.error && <div className="text-xs text-destructive">{modelsState.error}</div>}
              </div>
            );
          })}

          {providerActionMessage && (
            <p className="text-xs text-muted-foreground">{providerActionMessage}</p>
          )}
          {providerActionError && (
            <p className="text-xs text-destructive">{providerActionError}</p>
          )}
        </div>
      </div>

      {/* Invites */}
      <div className="space-y-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Invites
        </div>
        <div className="space-y-3 rounded-md border border-border px-4 py-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Generate a link to invite humans or agents to this company.</span>
            <HintIcon text="Invite links expire after 72 hours and allow both human and agent joins." />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? "Creating..." : "Create invite link"}
            </Button>
            {inviteLink && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteLink);
                }}
              >
                Copy link
              </Button>
            )}
          </div>
          {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
          {inviteLink && (
            <div className="rounded-md border border-border bg-muted/30 p-2">
              <div className="text-xs text-muted-foreground">Share link</div>
              <div className="mt-1 break-all font-mono text-xs">{inviteLink}</div>
            </div>
          )}
        </div>
      </div>

      {/* Archive */}
      <div className="space-y-4">
        <div className="text-xs font-medium text-amber-700 uppercase tracking-wide">
          Archive
        </div>
        <div className="space-y-3 rounded-md border border-amber-300/60 bg-amber-100/30 px-4 py-4">
          <p className="text-sm text-muted-foreground">
            Archive this company to hide it from the sidebar. This persists in the database.
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={archiveMutation.isPending || selectedCompany.status === "archived"}
              onClick={() => {
                if (!selectedCompanyId) return;
                const confirmed = window.confirm(
                  `Archive company "${selectedCompany.name}"? It will be hidden from the sidebar.`,
                );
                if (!confirmed) return;
                const nextCompanyId = companies.find((company) =>
                  company.id !== selectedCompanyId && company.status !== "archived")?.id ?? null;
                archiveMutation.mutate({ companyId: selectedCompanyId, nextCompanyId });
              }}
            >
              {archiveMutation.isPending
                ? "Archiving..."
                : selectedCompany.status === "archived"
                  ? "Already archived"
                  : "Archive company"}
            </Button>
            {archiveMutation.isError && (
              <span className="text-xs text-destructive">
                {archiveMutation.error instanceof Error
                  ? archiveMutation.error.message
                  : "Failed to archive company"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
