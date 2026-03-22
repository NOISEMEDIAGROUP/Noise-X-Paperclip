import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { businessOsApi } from "../../api/businessOs";
import { queryKeys } from "../../lib/queryKeys";
import { useCompany } from "../../context/CompanyContext";
import { useBreadcrumbs } from "../../context/BreadcrumbContext";

function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${Math.abs(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function FinancePage() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  useEffect(
    () =>
      setBreadcrumbs([
        { label: selectedCompany?.name ?? "Company", href: "/dashboard" },
        { label: "Business", href: "/company/revenue" },
        { label: "Finance" },
      ]),
    [selectedCompany?.name, setBreadcrumbs],
  );

  const query = useQuery({
    queryKey: selectedCompanyId ? queryKeys.businessOs.finance(selectedCompanyId) : ["business-os", "finance", "none"],
    queryFn: () => businessOsApi.finance(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  if (!selectedCompanyId) return null;
  if (query.isLoading) return <div className="text-sm text-muted-foreground">Loading finance...</div>;

  const data = query.data ?? {};
  const revenue = data.revenueCents ?? 0;
  const aiCosts = data.aiCostsCents ?? 0;
  const infraCosts = data.infraCostsCents ?? 0;
  const totalCosts = data.totalCostsCents ?? 0;
  const netProfit = data.netProfitCents ?? 0;
  const margin = data.marginPercent ?? 0;
  const infraCostItems = data.activeInfraCosts ?? [];
  const latestKpis = data.latestKpis ?? null;

  const hasData = revenue > 0 || totalCosts > 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Finance</h1>
        <p className="text-sm text-muted-foreground">
          Profit & loss summary: revenue minus AI and infrastructure costs.
          Shows your unit economics and margin health.
        </p>
      </div>

      {!hasData && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <div className="text-sm text-muted-foreground">No financial data yet.</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Data appears once you have revenue events or infrastructure costs configured.
          </div>
        </div>
      )}

      {hasData && (
        <>
          {/* P&L Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs text-muted-foreground uppercase">Revenue</div>
              <div className="mt-2 text-3xl font-semibold">{formatCents(revenue)}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs text-muted-foreground uppercase">AI Costs</div>
              <div className="mt-2 text-3xl font-semibold text-orange-500">{formatCents(aiCosts)}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs text-muted-foreground uppercase">Infra Costs</div>
              <div className="mt-2 text-3xl font-semibold text-orange-400">{formatCents(infraCosts)}</div>
            </div>
            <div className={`rounded-lg border bg-card p-4 ${netProfit >= 0 ? "border-green-500/30" : "border-red-500/30"}`}>
              <div className="text-xs text-muted-foreground uppercase">Net Profit</div>
              <div className={`mt-2 text-3xl font-semibold ${netProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
                {formatCents(netProfit)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{margin.toFixed(1)}% margin</div>
            </div>
          </div>

          {/* P&L Equation */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-sm font-medium mb-3">P&L Breakdown</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Revenue</span>
                <span className="font-semibold text-green-500">+{formatCents(revenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">− AI agent costs</span>
                <span className="font-semibold text-orange-500">-{formatCents(aiCosts)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">− Infrastructure costs</span>
                <span className="font-semibold text-orange-400">-{formatCents(infraCosts)}</span>
              </div>
              <div className="border-t border-border pt-2 flex items-center justify-between">
                <span className="font-medium">Net Profit</span>
                <span className={`font-bold ${netProfit >= 0 ? "text-green-500" : "text-red-500"}`}>{formatCents(netProfit)}</span>
              </div>
            </div>
          </div>

          {/* Latest KPIs */}
          {latestKpis && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-sm font-medium mb-3">Latest KPIs ({latestKpis.kpiDate})</div>
              <div className="grid gap-4 md:grid-cols-4 text-sm">
                <div>
                  <div className="text-muted-foreground">MRR</div>
                  <div className="font-semibold">{formatCents(latestKpis.mrrCents ?? 0)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Burn Rate</div>
                  <div className="font-semibold">{formatCents(latestKpis.burnRateCents ?? 0)}/mo</div>
                </div>
                <div>
                  <div className="text-muted-foreground">LTV</div>
                  <div className="font-semibold">{latestKpis.ltvCents != null ? formatCents(latestKpis.ltvCents) : "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">LTV/CAC Ratio</div>
                  <div className="font-semibold">{latestKpis.ltvCacRatio != null ? `${latestKpis.ltvCacRatio.toFixed(1)}x` : "—"}</div>
                </div>
              </div>
            </div>
          )}

          {/* Infrastructure Costs */}
          {infraCostItems.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-sm font-medium mb-3">Active Infrastructure Costs</div>
              <div className="space-y-2">
                {infraCostItems.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{item.category}</span>
                      <span className="text-muted-foreground ml-2">{item.description}</span>
                    </div>
                    <span className="font-semibold">{formatCents(item.amountCents)}/{item.currency ?? "usd"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
