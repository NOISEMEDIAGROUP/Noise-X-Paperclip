import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { businessOsApi } from "../../api/businessOs";
import { queryKeys } from "../../lib/queryKeys";
import { useCompany } from "../../context/CompanyContext";
import { useBreadcrumbs } from "../../context/BreadcrumbContext";
import { cn } from "../../lib/utils";

const statusColor: Record<string, string> = {
  healthy: "text-green-500 bg-green-500/10 border-green-500/30",
  degraded: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30",
  down: "text-red-500 bg-red-500/10 border-red-500/30",
};

export function HealthPage() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  useEffect(
    () =>
      setBreadcrumbs([
        { label: selectedCompany?.name ?? "Company", href: "/dashboard" },
        { label: "Business", href: "/company/revenue" },
        { label: "Health" },
      ]),
    [selectedCompany?.name, setBreadcrumbs],
  );

  const query = useQuery({
    queryKey: selectedCompanyId ? queryKeys.businessOs.health(selectedCompanyId) : ["business-os", "health", "none"],
    queryFn: () => businessOsApi.health(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  if (!selectedCompanyId) return null;
  if (query.isLoading) return <div className="text-sm text-muted-foreground">Loading health...</div>;

  const data = query.data ?? {};
  const currentStatus = (data.currentStatus ?? "healthy") as string;
  const uptime = data.uptimePercent7d ?? 100;
  const incidents = data.incidents ?? [];
  const checks24h = data.checks24h ?? [];

  const healthyCount = checks24h.filter((c: any) => c.status === "healthy").length;
  const totalChecks = checks24h.length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Product Health</h1>
        <p className="text-sm text-muted-foreground">
          Uptime monitoring, incident history, and endpoint status.
          Health checks run automatically against your configured healthcheck URL.
        </p>
      </div>

      {/* Current status + uptime */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className={cn("rounded-lg border p-4", statusColor[currentStatus] ?? statusColor.healthy)}>
          <div className="text-xs uppercase opacity-80">Current Status</div>
          <div className="mt-2 text-3xl font-semibold capitalize">{currentStatus}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase">Uptime (7 days)</div>
          <div className="mt-2 text-3xl font-semibold">{uptime.toFixed(1)}%</div>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full", uptime >= 99 ? "bg-green-500" : uptime >= 95 ? "bg-yellow-500" : "bg-red-500")}
              style={{ width: `${uptime}%` }}
            />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase">Checks (24h)</div>
          <div className="mt-2 text-3xl font-semibold">{healthyCount}/{totalChecks}</div>
          <div className="mt-1 text-xs text-muted-foreground">healthy responses</div>
        </div>
      </div>

      {/* Incidents */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-medium mb-3">Recent Incidents</div>
        {incidents.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No incidents recorded. This is good — your product is healthy.
          </div>
        ) : (
          <div className="space-y-2">
            {incidents.map((incident: any) => (
              <div
                key={incident.id}
                className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      statusColor[incident.status] ?? "text-muted-foreground",
                    )}
                  >
                    {incident.status}
                  </span>
                  <span className="text-muted-foreground truncate max-w-[300px]">{incident.endpointUrl}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {incident.httpStatus && <span>HTTP {incident.httpStatus}</span>}
                  {incident.responseMs && <span>{incident.responseMs}ms</span>}
                  <span>{incident.checkedAt ? new Date(incident.checkedAt).toLocaleString() : ""}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent checks */}
      {checks24h.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm font-medium mb-3">Health Check Log (24h)</div>
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {checks24h.slice(0, 20).map((check: any) => (
              <div key={check.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      check.status === "healthy" ? "bg-green-500" : check.status === "degraded" ? "bg-yellow-500" : "bg-red-500",
                    )}
                  />
                  <span className="text-muted-foreground truncate max-w-[250px]">{check.endpointUrl}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  {check.responseMs != null && <span>{check.responseMs}ms</span>}
                  <span>{check.checkedAt ? new Date(check.checkedAt).toLocaleTimeString() : ""}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {checks24h.length === 0 && incidents.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <div className="text-sm text-muted-foreground">No health check data yet.</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Set a <code className="bg-muted px-1 rounded">healthcheckUrl</code> in your business config to start monitoring.
          </div>
        </div>
      )}
    </div>
  );
}
