import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/lib/router";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { businessOsApi } from "../api/businessOs";
import { queryKeys } from "../lib/queryKeys";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export function Portfolio() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const query = useQuery({ queryKey: queryKeys.portfolio, queryFn: () => businessOsApi.portfolio() });

  useEffect(() => {
    setBreadcrumbs([{ label: "Portfolio" }]);
  }, [setBreadcrumbs]);

  if (query.isLoading) return <div className="text-sm text-muted-foreground">Loading portfolio...</div>;
  if (query.isError) return <div className="text-sm text-destructive">{query.error instanceof Error ? query.error.message : "Failed to load portfolio"}</div>;

  const data = query.data!;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Portfolio</h1>
        <p className="text-sm text-muted-foreground">Business OS overview across all tracked companies.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Total MRR</div><div className="mt-2 text-2xl font-semibold">{formatMoney(data.totals.mrrCents)}</div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Total Costs</div><div className="mt-2 text-2xl font-semibold">{formatMoney(data.totals.totalCostsCents)}</div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Net Profit</div><div className="mt-2 text-2xl font-semibold">{formatMoney(data.totals.profitCents)}</div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Companies</div><div className="mt-2 text-2xl font-semibold">{data.totals.companies}</div></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="text-sm font-medium">Company snapshots</div>
          <div className="space-y-3">
            {(data.companies as Array<Record<string, any>>).map((company) => (
              <Link key={company.companyId} to={`/${company.issuePrefix}/company/revenue`} className="flex items-center justify-between gap-4 rounded-lg border border-border/70 px-3 py-3 transition-colors hover:bg-muted/30">
                <div>
                  <div className="font-medium">{company.name}</div>
                  <div className="text-xs text-muted-foreground">Users {company.userCount} · Agents {company.agentCount} · Health {company.healthStatus}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatMoney(company.mrrCents)}</div>
                  <div className="text-xs text-muted-foreground">Profit {formatMoney(company.profitCents)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="text-sm font-medium">Recent notifications</div>
          <div className="space-y-3">
            {data.recentNotifications.length === 0 && <div className="text-sm text-muted-foreground">No notifications yet.</div>}
            {(data.recentNotifications as Array<Record<string, any>>).map((item) => (
              <div key={item.id} className="rounded-lg border border-border/70 px-3 py-3">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{item.channel}</span>
                  <span>{item.status}</span>
                </div>
                <div className="mt-1 text-sm font-medium">{item.subject ?? item.notificationType}</div>
                <div className="mt-1 text-xs text-muted-foreground line-clamp-3">{item.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
