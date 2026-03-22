import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { businessOsApi } from "../../api/businessOs";
import { queryKeys } from "../../lib/queryKeys";
import { useCompany } from "../../context/CompanyContext";
import { useBreadcrumbs } from "../../context/BreadcrumbContext";

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function RevenuePage() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  useEffect(() => {
    setBreadcrumbs([
      { label: selectedCompany?.name ?? "Company", href: "/dashboard" },
      { label: "Business", href: "/company/revenue" },
      { label: "Revenue" },
    ]);
  }, [selectedCompany?.name, setBreadcrumbs]);

  const query = useQuery({
    queryKey: selectedCompanyId ? queryKeys.businessOs.revenue(selectedCompanyId) : ["business-os", "revenue", "none"],
    queryFn: () => businessOsApi.revenue(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  if (!selectedCompanyId) return null;
  if (query.isLoading) return <div className="text-sm text-muted-foreground">Loading revenue...</div>;

  const data = query.data ?? {};
  const mrr = data.mrrCents ?? 0;
  const total = data.totalRevenueCents ?? 0;
  const breakdown = data.breakdown ?? {};
  const events = data.recentEvents ?? [];

  const hasData = mrr > 0 || total > 0 || events.length > 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Revenue</h1>
        <p className="text-sm text-muted-foreground">
          Monthly recurring revenue, total income, and recent payment events.
          Revenue data syncs from your Stripe integration.
        </p>
      </div>

      {!hasData && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <div className="text-sm text-muted-foreground">No revenue data yet.</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Connect Stripe in <a href="/settings/integrations" className="underline">Settings → Integrations</a> to start tracking revenue automatically.
          </div>
        </div>
      )}

      {hasData && (
        <>
          {/* MRR + Total Revenue */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs text-muted-foreground uppercase">Monthly Recurring Revenue</div>
              <div className="mt-2 text-3xl font-semibold">{formatCents(mrr)}</div>
              <div className="mt-1 text-xs text-muted-foreground">From latest user snapshot</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs text-muted-foreground uppercase">Total Revenue (period)</div>
              <div className="mt-2 text-3xl font-semibold">{formatCents(total)}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs text-muted-foreground uppercase">Subscriptions</div>
              <div className="mt-2 text-3xl font-semibold">{formatCents(breakdown.subscriptionsCents ?? 0)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Recurring payments</div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-sm font-medium mb-3">Revenue Breakdown</div>
            <div className="grid gap-4 md:grid-cols-4 text-sm">
              <div>
                <div className="text-muted-foreground">Subscriptions</div>
                <div className="font-semibold">{formatCents(breakdown.subscriptionsCents ?? 0)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">One-time</div>
                <div className="font-semibold">{formatCents(breakdown.oneTimeCents ?? 0)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Refunds</div>
                <div className="font-semibold text-destructive">-{formatCents(breakdown.refundsCents ?? 0)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Failed charges</div>
                <div className="font-semibold">{breakdown.failedCharges ?? 0}</div>
              </div>
            </div>
          </div>

          {/* Recent events */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-sm font-medium mb-3">Recent Payment Events</div>
            {events.length === 0 ? (
              <div className="text-sm text-muted-foreground">No events recorded yet.</div>
            ) : (
              <div className="space-y-2">
                {events.map((event: any) => (
                  <div key={event.id} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{event.eventType}</span>
                      <span className="text-muted-foreground ml-2">{event.customerEmail ?? "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{formatCents(event.amountCents ?? 0)}</span>
                      <span className="text-xs text-muted-foreground">
                        {event.occurredAt ? new Date(event.occurredAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
