import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { governanceApi } from "../../api/governance";
import { agentsApi } from "../../api/agents";
import { useCompany } from "../../context/CompanyContext";
import { useBreadcrumbs } from "../../context/BreadcrumbContext";
import { queryKeys } from "../../lib/queryKeys";
import { cn } from "../../lib/utils";

const modeColors: Record<string, string> = {
  autonomous: "bg-green-500/10 text-green-500 border-green-500/30",
  supervised: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  manual: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  paused: "bg-muted text-muted-foreground border-border",
};

const modeDescriptions: Record<string, string> = {
  autonomous: "Agent acts independently — makes decisions and executes without human approval. Best for trusted, repetitive tasks.",
  supervised: "Agent proposes actions but requires human approval before executing. Use when you want oversight on important decisions.",
  manual: "Agent only acts when you explicitly trigger it (via Invoke). No autonomous behavior — useful for testing or sensitive operations.",
};

export function GovernancePage() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  useEffect(
    () =>
      setBreadcrumbs([
        { label: selectedCompany?.name ?? "Company", href: "/dashboard" },
        { label: "Settings", href: "/settings/company" },
        { label: "Governance" },
      ]),
    [selectedCompany?.name, setBreadcrumbs],
  );

  const catalog = useQuery({
    queryKey: selectedCompanyId ? queryKeys.governance.catalog(selectedCompanyId) : ["governance", "none"],
    queryFn: () => governanceApi.actionCatalog(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });
  const agents = useQuery({
    queryKey: selectedCompanyId ? queryKeys.agents.list(selectedCompanyId) : ["agents", "none"],
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  if (!selectedCompanyId) return null;
  if (catalog.isLoading || agents.isLoading)
    return <div className="text-sm text-muted-foreground">Loading governance...</div>;

  const catalogData = catalog.data ?? [];
  const agentsData = agents.data ?? [];
  const withPolicy = agentsData.filter((a: any) => a.runtimePolicy);
  const byMode = agentsData.reduce(
    (acc: Record<string, number>, a: any) => {
      const mode = a.mode ?? "unknown";
      acc[mode] = (acc[mode] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Governance</h1>
        <p className="text-sm text-muted-foreground">
          Controls what agents can do, how they operate, and under what policies.
          Use this to define safety boundaries and approval requirements for your AI workforce.
        </p>
      </div>

      {/* Mode guide */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-medium mb-3">Agent Modes</div>
        <div className="grid gap-3 md:grid-cols-3">
          {Object.entries(modeDescriptions).map(([mode, desc]) => (
            <div key={mode} className="rounded-md border border-border/60 p-3">
              <span className={cn("rounded-full border px-2 py-0.5 text-xs capitalize font-medium", modeColors[mode])}>
                {mode}
              </span>
              <p className="mt-2 text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase">Action Catalog</div>
          <div className="mt-2 text-3xl font-semibold">{catalogData.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">Defined action types</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase">Agents with Policy</div>
          <div className="mt-2 text-3xl font-semibold">{withPolicy.length}/{agentsData.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">Policy coverage</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase">Modes</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(byMode).map(([mode, count]) => (
              <span
                key={mode}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs capitalize",
                  modeColors[mode] ?? "text-muted-foreground",
                )}
              >
                {mode}: {count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Agent policies */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-medium mb-3">Agent Policies</div>
        {agentsData.length === 0 ? (
          <div className="text-sm text-muted-foreground">No agents configured.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {agentsData.map((agent: any) => (
              <div key={agent.id} className="rounded-md border border-border/60 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{agent.name}</span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-xs capitalize",
                      modeColors[agent.mode] ?? "text-muted-foreground",
                    )}
                  >
                    {agent.mode ?? "default"}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Role</span>
                    <span>{agent.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Classes</span>
                    <span>{(agent.classes ?? []).join(", ") || "none"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Environment</span>
                    <span>{agent.runtimeEnvironment ?? "default"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Policy</span>
                    <span>{agent.runtimePolicy ? "configured" : "none"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action catalog */}
      {catalogData.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm font-medium mb-3">Action Catalog</div>
          <div className="space-y-1">
            {catalogData.map((entry: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-sm rounded-md border border-border/60">
                <div>
                  <span className="font-medium">{entry.action ?? entry.name ?? `Action ${i + 1}`}</span>
                  {entry.description && <span className="text-muted-foreground ml-2">{entry.description}</span>}
                </div>
                {entry.riskLevel && (
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-xs",
                    entry.riskLevel === "high" ? "bg-red-500/10 text-red-500" :
                    entry.riskLevel === "medium" ? "bg-yellow-500/10 text-yellow-500" :
                    "bg-green-500/10 text-green-500"
                  )}>
                    {entry.riskLevel}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
