import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { newsletterApi } from "../../api/newsletter";
import { queryKeys } from "../../lib/queryKeys";
import { useCompany } from "../../context/CompanyContext";
import { useBreadcrumbs } from "../../context/BreadcrumbContext";

export function NewsletterPage() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  useEffect(
    () =>
      setBreadcrumbs([
        { label: selectedCompany?.name ?? "Company", href: "/dashboard" },
        { label: "Business", href: "/company/revenue" },
        { label: "Newsletter" },
      ]),
    [selectedCompany?.name, setBreadcrumbs],
  );

  const query = useQuery({
    queryKey: selectedCompanyId ? queryKeys.newsletter.summary(selectedCompanyId) : ["newsletter", "none"],
    queryFn: () => newsletterApi.summary(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  if (!selectedCompanyId) return null;
  if (query.isLoading) return <div className="text-sm text-muted-foreground">Loading newsletter...</div>;

  const data = query.data ?? {};
  const subs = data.subscribers ?? {};
  const total = subs.total ?? 0;
  const pending = subs.pending ?? 0;
  const paid = subs.paid ?? 0;
  const unsubscribed = subs.unsubscribed ?? 0;
  const landingPath = data.landingPath ?? "#";

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{data.productName ?? "Newsletter"}</h1>
          <p className="text-sm text-muted-foreground">
            Subscriber funnel, product health, and landing page status.
            Subscribers sign up through your public landing page.
          </p>
        </div>
        <a
          href={landingPath}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent/50"
        >
          Open landing →
        </a>
      </div>

      {total === 0 && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <div className="text-sm text-muted-foreground">No subscribers yet.</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Share your landing page to start collecting subscribers.
          </div>
        </div>
      )}

      {/* Subscriber funnel */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Subscribers</div>
          <div className="mt-2 text-3xl font-semibold">{total}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase">Pending</div>
          <div className="mt-2 text-3xl font-semibold text-yellow-500">{pending}</div>
          <div className="mt-1 text-xs text-muted-foreground">Awaiting confirmation</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase">Paid</div>
          <div className="mt-2 text-3xl font-semibold text-green-500">{paid}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase">Unsubscribed</div>
          <div className="mt-2 text-3xl font-semibold text-muted-foreground">{unsubscribed}</div>
        </div>
      </div>

      {/* Funnel visualization */}
      {total > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm font-medium mb-3">Conversion Funnel</div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Signed up</span>
                <span>{total}</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: "100%" }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Confirmed</span>
                <span>{total - pending}</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${total > 0 ? ((total - pending) / total) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Paid</span>
                <span>{paid}</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${total > 0 ? (paid / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
