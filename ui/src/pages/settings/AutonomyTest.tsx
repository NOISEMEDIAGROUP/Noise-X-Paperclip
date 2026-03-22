import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { autonomyTestApi } from "../../api/autonomyTest";
import { useCompany } from "../../context/CompanyContext";
import { useBreadcrumbs } from "../../context/BreadcrumbContext";

export function AutonomyTestPage() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [report, setReport] = useState<any | null>(null);

  useEffect(() => {
    setBreadcrumbs([
      { label: selectedCompany?.name ?? "Company", href: "/dashboard" },
      { label: "Settings", href: "/settings/config" },
      { label: "Autonomy Test" },
    ]);
  }, [selectedCompany?.name, setBreadcrumbs]);

  const run = useMutation({
    mutationFn: () => autonomyTestApi.run(selectedCompanyId!),
    onSuccess: (result) => setReport(result),
  });

  if (!selectedCompanyId) return null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Autonomous Test</h1>
          <p className="text-sm text-muted-foreground">Runs an accelerated Phase 8 autonomy scenario against the current company and scores the 12 checkpoints from live evidence.</p>
        </div>
        <button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => run.mutate()} disabled={run.isPending}>{run.isPending ? "Running..." : "Run test"}</button>
      </div>

      {report ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Passed</div><div className="mt-2 text-3xl font-semibold">{report.summary?.passed ?? 0}</div></div>
            <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Failed</div><div className="mt-2 text-3xl font-semibold">{report.summary?.failed ?? 0}</div></div>
            <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Run ID</div><div className="mt-2 text-sm font-mono break-all">{report.runId}</div></div>
          </div>
          <div className="space-y-3">
            {(report.checkpoints ?? []).map((checkpoint: any) => (
              <div key={checkpoint.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{checkpoint.id}. {checkpoint.label}</div>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs uppercase">{checkpoint.status}</span>
                </div>
                <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  {(checkpoint.evidence ?? []).map((item: string, index: number) => <li key={index}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground">Run the accelerated autonomy scenario to generate a checkpoint report.</div>
      )}
    </div>
  );
}
