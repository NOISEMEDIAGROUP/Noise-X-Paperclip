/**
 * Integrations Tab - Clean UX
 * 
 * Sections:
 * 1. Business Integrations - Cards with Connect buttons
 * 2. AI Providers - Cards with Connect buttons (simplified)
 * 
 * Removed:
 * - Notification Channels (integrated into Connect modals)
 * - Secrets Management (handled automatically by Connect modals)
 */

import { useState, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useCompany } from "../../context/CompanyContext";
import { businessOsApi } from "../../api/businessOs";
import { secretsApi } from "../../api/secrets";
import { agentsApi } from "../../api/agents";
import { queryKeys } from "../../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Plug, CheckCircle2, XCircle, KeyRound, Sparkles, MoreVertical, Trash2, Settings, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import type { CompanySecret } from "@paperclipai/shared";
import {
  getAllIntegrations,
  getIntegrationConfig,
  type IntegrationConfig,
} from "./integrationConfigs";
import { IntegrationConnectModal } from "./IntegrationConnectModal";
import {
  getAllAIProviders,
  getAIProviderConfig,
  type AIProviderConfig,
} from "./aiProviderConfigs";
import { AIProviderConnectModal } from "./AIProviderConnectModal";
import { RecommendationsSection } from "./RecommendationsSection";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ============================================================================
// Types
// ============================================================================

const statusStyles: Record<string, string> = {
  connected: "text-green-500 bg-green-500/10 border-green-500/30",
  partial: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30",
  not_configured: "text-muted-foreground bg-muted border-border",
};

// Map adapter types and models to AI providers
const ADAPTER_TO_PROVIDER: Record<string, string> = {
  codex_local: "openai",
  claude_local: "anthropic",
};

// Map model prefixes to providers for process adapter
const MODEL_PREFIX_TO_PROVIDER: Record<string, string> = {
  gpt: "openai",
  o1: "openai",
  claude: "anthropic",
  qwen: "alibaba",
  llama: "groq",
  mixtral: "groq",
  gemma: "groq",
  grok: "xai",
  abab: "minimax",
};

function getProviderForAgent(agent: { adapterType: string; adapterConfig: Record<string, unknown> }): string | null {
  // Direct adapter mapping
  if (ADAPTER_TO_PROVIDER[agent.adapterType]) {
    return ADAPTER_TO_PROVIDER[agent.adapterType];
  }
  
  // For process adapter, check the model in adapterConfig
  if (agent.adapterType === "process") {
    const model = agent.adapterConfig?.model as string | undefined;
    if (model) {
      for (const [prefix, provider] of Object.entries(MODEL_PREFIX_TO_PROVIDER)) {
        if (model.toLowerCase().includes(prefix)) {
          return provider;
        }
      }
    }
  }
  
  return null;
}

// ============================================================================
// Component
// ============================================================================

export function IntegrationsTab() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  // Modal states
  const [activeIntegration, setActiveIntegration] = useState<IntegrationConfig | null>(null);
  const [activeAIProvider, setActiveAIProvider] = useState<AIProviderConfig | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [aiProviderModalOpen, setAIProviderModalOpen] = useState(false);

  // Disconnect confirmation states
  const [disconnectTarget, setDisconnectTarget] = useState<{ type: "integration" | "aiProvider"; id: string; name: string } | null>(null);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);

  // Queries
  const integrationStatusQuery = useQuery({
    queryKey: selectedCompanyId
      ? queryKeys.businessOs.integrationStatus(selectedCompanyId)
      : ["business-os", "integration-status", "none"],
    queryFn: () => businessOsApi.integrationStatus(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  const secretsQuery = useQuery({
    queryKey: selectedCompanyId ? queryKeys.secrets.list(selectedCompanyId) : ["secrets", "none"],
    queryFn: () => secretsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  // Agents query to show which agents use which provider
  const agentsQuery = useQuery({
    queryKey: selectedCompanyId ? queryKeys.agents.list(selectedCompanyId) : ["agents", "none"],
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  // Build secret maps
  const secretNameToId = useMemo(() => {
    const map = new Map<string, string>();
    for (const secret of secretsQuery.data ?? []) {
      map.set(secret.name, secret.id);
    }
    return map;
  }, [secretsQuery.data]);

  const knownSecrets = useMemo(
    () => new Set((secretsQuery.data ?? []).map((s: CompanySecret) => s.name)),
    [secretsQuery.data]
  );

  // Map providers to agents using them
  const providerToAgents = useMemo(() => {
    const map = new Map<string, Array<{ id: string; name: string; role: string }>>();
    const agents = agentsQuery.data ?? [];
    
    for (const agent of agents) {
      if (agent.status === "terminated") continue;
      const providerId = getProviderForAgent(agent);
      if (providerId) {
        if (!map.has(providerId)) {
          map.set(providerId, []);
        }
        map.get(providerId)!.push({
          id: agent.id,
          name: agent.name,
          role: agent.role,
        });
      }
    }
    
    return map;
  }, [agentsQuery.data]);

  // Integration status data
  const integrationStatusData = integrationStatusQuery.data ?? {};

  // Count integrations by status
  const allIntegrations = getAllIntegrations();
  const connectedCount = allIntegrations.filter((i) => {
    const status = integrationStatusData[i.id]?.status;
    return status === "connected";
  }).length;
  const partialCount = allIntegrations.filter((i) => {
    const status = integrationStatusData[i.id]?.status;
    return status === "partial";
  }).length;

  // AI Providers status
  const allAIProviders = getAllAIProviders();
  const connectedAIProviders = allAIProviders.filter((p) =>
    knownSecrets.has(p.secretName)
  ).length;

  // Handlers
  function handleOpenConnectModal(integrationId: string) {
    const config = getIntegrationConfig(integrationId);
    if (config) {
      setActiveIntegration(config);
      setModalOpen(true);
    }
  }

  function handleOpenAIProviderModal(providerId: string) {
    const config = getAIProviderConfig(providerId);
    if (config) {
      setActiveAIProvider(config);
      setAIProviderModalOpen(true);
    }
  }

  function handleModalSuccess() {
    queryClient.invalidateQueries({ queryKey: queryKeys.secrets.list(selectedCompanyId!) });
    queryClient.invalidateQueries({ queryKey: queryKeys.businessOs.config(selectedCompanyId!) });
    queryClient.invalidateQueries({ queryKey: queryKeys.businessOs.integrationStatus(selectedCompanyId!) });
  }

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (target: { type: "integration" | "aiProvider"; id: string }) => {
      if (target.type === "integration") {
        const config = getIntegrationConfig(target.id);
        if (!config) return;

        // Delete secrets
        const secretsToDelete = [config.secretNames.primary, ...(config.secretNames.additional || [])];
        for (const secretName of secretsToDelete) {
          const secretId = secretNameToId.get(secretName);
          if (secretId) {
            await secretsApi.remove(secretId);
          }
        }

        // Disable in business config
        const configUpdates: Record<string, unknown> = {};
        if (target.id === "telegram") configUpdates.telegramEnabled = false;
        if (target.id === "slack") configUpdates.slackEnabled = false;
        if (target.id === "resend") configUpdates.emailEnabled = false;
        
        // Clear secret references
        for (const field of config.configFields) {
          if (field.includes("SecretName") || field.includes("KeyName")) {
            configUpdates[field] = null;
          }
        }
        
        if (Object.keys(configUpdates).length > 0) {
          await businessOsApi.updateConfig(selectedCompanyId!, configUpdates);
        }
      } else if (target.type === "aiProvider") {
        const providerConfig = getAIProviderConfig(target.id);
        if (!providerConfig) return;

        // Delete the secret
        const secretId = secretNameToId.get(providerConfig.secretName);
        if (secretId) {
          await secretsApi.remove(secretId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.secrets.list(selectedCompanyId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.businessOs.config(selectedCompanyId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.businessOs.integrationStatus(selectedCompanyId!) });
      setDisconnectDialogOpen(false);
      setDisconnectTarget(null);
    },
  });

  function handleDisconnect(type: "integration" | "aiProvider", id: string, name: string) {
    setDisconnectTarget({ type, id, name });
    setDisconnectDialogOpen(true);
  }

  function confirmDisconnect() {
    if (disconnectTarget) {
      disconnectMutation.mutate(disconnectTarget);
    }
  }

  if (!selectedCompanyId) return null;

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase">Integrations</div>
          <div className="mt-2 text-3xl font-semibold text-green-500">{connectedCount}</div>
          <div className="text-xs text-muted-foreground">connected</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase">Partial</div>
          <div className="mt-2 text-3xl font-semibold text-yellow-500">{partialCount}</div>
          <div className="text-xs text-muted-foreground">needs attention</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase">AI Providers</div>
          <div className="mt-2 text-3xl font-semibold text-blue-500">{connectedAIProviders}</div>
          <div className="text-xs text-muted-foreground">configured</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase">Not Set Up</div>
          <div className="mt-2 text-3xl font-semibold text-muted-foreground">
            {allIntegrations.length - connectedCount - partialCount}
          </div>
          <div className="text-xs text-muted-foreground">remaining</div>
</div>
      </div>

      {/* Agent Recommendations */}
      <RecommendationsSection />

      {/* Business Integrations */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Business Integrations</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Connect external services to enable features like payments, notifications, and analytics.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allIntegrations.map((integration) => {
            const status = integrationStatusData[integration.id] ?? {};
            const statusValue = status.status ?? "not_configured";
            const Icon = integration.icon;
            const isConnected = statusValue === "connected";

            return (
              <div
                key={integration.id}
                className={cn(
                  "rounded-lg border bg-card p-4 transition-colors",
                  isConnected ? "border-green-500/30" : "border-border"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{integration.name}</span>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-xs",
                      statusStyles[statusValue] ?? statusStyles.not_configured
                    )}
                  >
                    {statusValue.replace("_", " ")}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {integration.description}
                </p>

                {isConnected ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="w-full">
                        <Settings className="h-3.5 w-3.5 mr-1.5" />
                        Connected
                        <MoreVertical className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => handleOpenConnectModal(integration.id)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Update settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDisconnect("integration", integration.id, integration.name)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Disconnect
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    size="sm"
                    variant="default"
                    className="w-full"
                    onClick={() => handleOpenConnectModal(integration.id)}
                  >
                    <Plug className="h-3.5 w-3.5 mr-1.5" />
                    Connect
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Providers */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">AI Providers</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure AI model providers for your agents. Each provider offers different models and capabilities.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allAIProviders.map((provider) => {
            const isConnected = knownSecrets.has(provider.secretName);
            const Icon = provider.icon;
            const agentsUsingProvider = providerToAgents.get(provider.id) ?? [];

            return (
              <div
                key={provider.id}
                className={cn(
                  "rounded-lg border bg-card p-4 transition-colors",
                  isConnected ? "border-blue-500/30" : "border-border"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{provider.name}</span>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-xs",
                      isConnected
                        ? "text-green-500 bg-green-500/10 border-green-500/30"
                        : "text-muted-foreground bg-muted border-border"
                    )}
                  >
                    {isConnected ? "configured" : "not set up"}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {provider.description}
                </p>

                {isConnected && provider.popularModels && (
                  <p className="text-xs text-muted-foreground mb-1">
                    Popular: {provider.popularModels.slice(0, 2).join(", ")}
                  </p>
                )}

                {agentsUsingProvider.length > 0 && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Used by: {agentsUsingProvider.slice(0, 3).map(a => a.name).join(", ")}
                    {agentsUsingProvider.length > 3 && ` +${agentsUsingProvider.length - 3} more`}
                  </p>
                )}

                {isConnected ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="w-full">
                        <Settings className="h-3.5 w-3.5 mr-1.5" />
                        Configured
                        <MoreVertical className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => handleOpenAIProviderModal(provider.id)}>
                        <KeyRound className="h-4 w-4 mr-2" />
                        Update key
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDisconnect("aiProvider", provider.id, provider.name)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    size="sm"
                    variant="default"
                    className="w-full"
                    onClick={() => handleOpenAIProviderModal(provider.id)}
                  >
                    <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                    Connect
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Integration Connect Modal */}
      {activeIntegration && (
        <IntegrationConnectModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          config={activeIntegration}
          existingSecrets={secretNameToId}
          existingConfig={{}}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* AI Provider Connect Modal */}
      {activeAIProvider && (
        <AIProviderConnectModal
          open={aiProviderModalOpen}
          onOpenChange={setAIProviderModalOpen}
          config={activeAIProvider}
          existingSecretId={secretNameToId.get(activeAIProvider.secretName)}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disconnect {disconnectTarget?.name}?</DialogTitle>
            <DialogDescription>
              This will remove the stored credentials for {disconnectTarget?.name}. You'll need to
              reconnect the integration to use it again. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDisconnect}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                "Disconnect"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}