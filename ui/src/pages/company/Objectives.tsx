import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { objectivesApi } from "../../api/objectives";
import { queryKeys } from "../../lib/queryKeys";
import { useCompany } from "../../context/CompanyContext";
import { useBreadcrumbs } from "../../context/BreadcrumbContext";

export function ObjectivesPage() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  useEffect(() => setBreadcrumbs([{ label: selectedCompany?.name ?? "Company", href: "/dashboard" }, { label: "Objectives" }]), [selectedCompany?.name, setBreadcrumbs]);
  const query = useQuery({
    queryKey: selectedCompanyId ? queryKeys.objectives.list(selectedCompanyId) : ["objectives", "none"],
    queryFn: () => objectivesApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });
  const create = useMutation({
    mutationFn: () => objectivesApi.create(selectedCompanyId!, { title, objectiveType: "quarterly", status: "proposed", currentValue: 0, keyResults: [] }),
    onSuccess: () => { setTitle(""); queryClient.invalidateQueries({ queryKey: queryKeys.objectives.list(selectedCompanyId!) }); },
  });
  if (!selectedCompanyId) return null;
  if (query.isLoading) return <div className="text-sm text-muted-foreground">Loading objectives...</div>;
  return <div className="space-y-4"><h1 className="text-2xl font-semibold">Objectives</h1><div className="flex gap-2"><input className="rounded-md border border-border bg-transparent px-3 py-2 text-sm" placeholder="New objective title" value={title} onChange={(e) => setTitle(e.target.value)} /><button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => create.mutate()} disabled={!title.trim() || create.isPending}>Create</button></div><div className="space-y-3">{(query.data ?? []).map((item: any) => <div key={item.id} className="rounded-lg border border-border bg-card p-4"><div className="font-medium">{item.title}</div><div className="text-sm text-muted-foreground">{item.status} · {item.objectiveType}</div></div>)}</div></div>;
}
