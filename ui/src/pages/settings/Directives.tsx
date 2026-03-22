import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { issuesApi } from "../../api/issues";
import { useCompany } from "../../context/CompanyContext";
import { useBreadcrumbs } from "../../context/BreadcrumbContext";
import { queryKeys } from "../../lib/queryKeys";

export function DirectivesPage() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  useEffect(() => setBreadcrumbs([{ label: selectedCompany?.name ?? 'Company', href: '/dashboard' }, { label: 'Settings', href: '/settings/config' }, { label: 'Directives' }]), [selectedCompany?.name, setBreadcrumbs]);
  const query = useQuery({ queryKey: selectedCompanyId ? queryKeys.issues.list(selectedCompanyId) : ['issues','none'], queryFn: () => issuesApi.list(selectedCompanyId!), enabled: Boolean(selectedCompanyId), select: (items:any[]) => items.filter((item:any)=>item.labels?.some((label:any)=>label.name==='board-directive')) });
  const create = useMutation({ mutationFn: () => issuesApi.create(selectedCompanyId!, { title, description, status: 'todo', priority: 'high', labels: ['board-directive'] as any }), onSuccess: ()=>{ setTitle(''); setDescription(''); queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(selectedCompanyId!) }); } });
  if (!selectedCompanyId) return null;
  if (query.isLoading) return <div className="text-sm text-muted-foreground">Loading directives...</div>;
  return <div className="space-y-4"><h1 className="text-2xl font-semibold">Board Directives</h1><div className="grid gap-2"><input className="rounded-md border border-border bg-transparent px-3 py-2 text-sm" placeholder="Directive title" value={title} onChange={(e)=>setTitle(e.target.value)} /><textarea className="min-h-24 rounded-md border border-border bg-transparent px-3 py-2 text-sm" placeholder="Directive description" value={description} onChange={(e)=>setDescription(e.target.value)} /><button className="rounded-md border border-border px-3 py-2 text-sm" onClick={()=>create.mutate()} disabled={!title.trim() || create.isPending}>Send directive</button></div><div className="space-y-3">{(query.data ?? []).map((item:any)=><div key={item.id} className="rounded-lg border border-border bg-card p-4"><div className="font-medium">{item.title}</div><div className="text-sm text-muted-foreground">{item.identifier}</div></div>)}</div></div>;
}
