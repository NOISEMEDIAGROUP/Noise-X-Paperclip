import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { businessOsApi } from "../../api/businessOs";
import { queryKeys } from "../../lib/queryKeys";
import { useCompany } from "../../context/CompanyContext";
import { useBreadcrumbs } from "../../context/BreadcrumbContext";

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function UsersPage() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  useEffect(
    () =>
      setBreadcrumbs([
        { label: selectedCompany?.name ?? "Company", href: "/dashboard" },
        { label: "Business", href: "/company/revenue" },
        { label: "Users" },
      ]),
    [selectedCompany?.name, setBreadcrumbs],
  );

  const query = useQuery({
    queryKey: selectedCompanyId ? queryKeys.businessOs.users(selectedCompanyId) : ["business-os", "users", "none"],
    queryFn: () => businessOsApi.users(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  if (!selectedCompanyId) return null;
  if (query.isLoading) return <div className="text-sm text-muted-foreground">Loading users...</div>;

  const data = query.data ?? {};
  const funnel = data.funnel ?? {};
  const snapshot = data.currentSnapshot ?? null;
  const trend = data.trend ?? [];

  const total = funnel.totalUsers ?? 0;
  const free = funnel.freeUsers ?? 0;
  const paid = funnel.paidUsers ?? 0;
  const conversion = funnel.conversionRate ?? 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">
          User acquisition funnel, conversion rates, and growth metrics.
          Data comes from your user metrics snapshots.
        </p>
      </div>

      {total === 0 && !snapshot && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <div className="text-sm text-muted-foreground">No user data yet.</div>
          <div className="mt-1 text-xs text-muted-foreground">
            User metrics appear once you start collecting snapshots via the business OS API.
          </div>
        </div>
      )}

      {/* Funnel */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Users</div>
          <div className="mt-2 text-3xl font-semibold">{total}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase">Free Users</div>
          <div className="mt-2 text-3xl font-semibold">{free}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase">Paid Users</div>
          <div className="mt-2 text-3xl font-semibold text-green-500">{paid}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase">Conversion Rate</div>
          <div className="mt-2 text-3xl font-semibold">{conversion.toFixed(1)}%</div>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500"
              style={{ width: `${Math.min(conversion, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Current snapshot details */}
      {snapshot && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm font-medium mb-3">Latest Snapshot ({snapshot.snapshotDate})</div>
          <div className="grid gap-4 md:grid-cols-4 text-sm">
            <div>
              <div className="text-muted-foreground">New Signups</div>
              <div className="font-semibold">{snapshot.newSignups ?? 0}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Churned</div>
              <div className="font-semibold text-red-500">{snapshot.churned ?? 0}</div>
            </div>
            <div>
              <div className="text-muted-foreground">MRR</div>
              <div className="font-semibold">{formatCents(snapshot.mrrCents ?? 0)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">ARPU</div>
              <div className="font-semibold">{formatCents(snapshot.arpuCents ?? 0)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Trend */}
      {trend.length > 1 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm font-medium mb-3">Growth Trend ({trend.length} snapshots)</div>
          <div className="space-y-1">
            {trend.slice(-10).map((snap: any) => (
              <div key={snap.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                <span className="text-muted-foreground">{snap.snapshotDate}</span>
                <div className="flex items-center gap-4">
                  <span>Total: {snap.totalUsers}</span>
                  <span className="text-green-500">+{snap.newSignups}</span>
                  {snap.churned > 0 && <span className="text-red-500">-{snap.churned}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
