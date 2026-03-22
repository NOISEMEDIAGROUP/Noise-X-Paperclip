import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { departmentsApi } from "../../api/departments";
import { queryKeys } from "../../lib/queryKeys";
import { useCompany } from "../../context/CompanyContext";
import { useBreadcrumbs } from "../../context/BreadcrumbContext";

export function DepartmentsPage() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  useEffect(() => setBreadcrumbs([{ label: selectedCompany?.name ?? "Company", href: "/dashboard" }, { label: "Settings", href: "/settings/config" }, { label: "Departments" }]), [selectedCompany?.name, setBreadcrumbs]);
  const query = useQuery({
    queryKey: selectedCompanyId ? queryKeys.departments.status(selectedCompanyId) : ["departments", "none"],
    queryFn: () => departmentsApi.status(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });
  const bootstrap = useMutation({
    mutationFn: () => departmentsApi.bootstrap(selectedCompanyId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.departments.status(selectedCompanyId!) }),
  });
  if (!selectedCompanyId) return null;
  if (query.isLoading) return <div className="text-sm text-muted-foreground">Loading department wiring...</div>;
  const data = query.data ?? { entries: [] };
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Department Wiring</h1>
          <p className="text-sm text-muted-foreground">Bootstrap CEO, Finance, Marketing, Support, Security, Reliability, and Developer department leads with verified cadence and skills.</p>
        </div>
        <button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => bootstrap.mutate()} disabled={bootstrap.isPending}>Bootstrap departments</button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground uppercase">Ready</div><div className="mt-2 text-2xl font-semibold">{data.readyCount ?? 0}</div></div>
        <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground uppercase">Partial</div><div className="mt-2 text-2xl font-semibold">{data.partialCount ?? 0}</div></div>
        <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground uppercase">Missing</div><div className="mt-2 text-2xl font-semibold">{data.missingCount ?? 0}</div></div>
      </div>
      <div className="space-y-3">{(data.entries ?? []).map((entry: any) => <div key={entry.key} className="rounded-lg border border-border bg-card p-4"><div className="flex items-center justify-between gap-3"><div><div className="font-medium">{entry.label}</div><div className="text-sm text-muted-foreground">{entry.title} · {entry.role} · heartbeat {entry.heartbeatIntervalSec}s</div></div><span className="rounded-full border border-border px-2 py-0.5 text-xs">{entry.status}</span></div>{entry.existingAgentName && <div className="mt-2 text-sm text-muted-foreground">Agent: {entry.existingAgentName}</div>}{entry.reasons?.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground">{entry.reasons.map((reason: string, idx: number) => <li key={idx}>{reason}</li>)}</ul>}</div>)}</div>
    </div>
  );
}
