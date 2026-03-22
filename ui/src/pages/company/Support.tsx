import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { issuesApi } from "../../api/issues";
import { agentsApi } from "../../api/agents";
import { queryKeys } from "../../lib/queryKeys";
import { useCompany } from "../../context/CompanyContext";
import { useBreadcrumbs } from "../../context/BreadcrumbContext";

const SUPPORT_LABEL = "support";

export function SupportPage() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  useEffect(() => setBreadcrumbs([{ label: selectedCompany?.name ?? "Company", href: "/dashboard" }, { label: "Support" }]), [selectedCompany?.name, setBreadcrumbs]);

  const agentsQuery = useQuery({
    queryKey: selectedCompanyId ? queryKeys.agents.list(selectedCompanyId) : ["agents","none"],
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });
  const labelsQuery = useQuery({
    queryKey: selectedCompanyId ? queryKeys.issues.labels(selectedCompanyId) : ["labels","none"],
    queryFn: () => issuesApi.listLabels(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });
  const supportAgent = useMemo(() => (agentsQuery.data ?? []).find((a:any) => a.metadata?.departmentKey === "support") ?? null, [agentsQuery.data]);
  const supportLabel = useMemo(() => (labelsQuery.data ?? []).find((l:any) => l.name === SUPPORT_LABEL) ?? null, [labelsQuery.data]);
  const issuesQuery = useQuery({
    queryKey: selectedCompanyId ? queryKeys.issues.list(selectedCompanyId) : ["issues","none"],
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
    select: (items:any[]) => items.filter((item:any) => item.assigneeAgentId === supportAgent?.id || item.labels?.some((label:any) => label.name === SUPPORT_LABEL)),
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      let labelId = supportLabel?.id;
      if (!labelId) {
        const created = await issuesApi.createLabel(selectedCompanyId!, { name: SUPPORT_LABEL, color: "#0EA5E9" });
        labelId = created.id;
      }
      return issuesApi.create(selectedCompanyId!, {
        title,
        description,
        status: "todo",
        priority: "medium",
        assigneeAgentId: supportAgent?.id ?? null,
        labelIds: labelId ? [labelId] : [],
      });
    },
    onSuccess: () => {
      setTitle("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(selectedCompanyId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.labels(selectedCompanyId!) });
    },
  });

  if (!selectedCompanyId) return null;
  if (agentsQuery.isLoading || labelsQuery.isLoading || issuesQuery.isLoading) return <div className="text-sm text-muted-foreground">Loading support queue...</div>;
  const tickets = issuesQuery.data ?? [];
  const open = tickets.filter((i:any) => i.status !== "done" && i.status !== "cancelled");
  return <div className="space-y-6 max-w-5xl"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Support Queue</h1><p className="text-sm text-muted-foreground">Customer-facing triage, escalations, and follow-up work routed to the support lane.</p></div><div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">Owner: <span className="font-medium">{supportAgent?.name ?? 'Unassigned'}</span></div></div><div className="grid gap-4 md:grid-cols-3"><div className="rounded-lg border border-border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Open tickets</div><div className="mt-2 text-2xl font-semibold">{open.length}</div></div><div className="rounded-lg border border-border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Resolved</div><div className="mt-2 text-2xl font-semibold">{tickets.filter((i:any)=>i.status==='done').length}</div></div><div className="rounded-lg border border-border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Blocked</div><div className="mt-2 text-2xl font-semibold">{tickets.filter((i:any)=>i.status==='blocked').length}</div></div></div><div className="rounded-lg border border-border bg-card p-4 space-y-3"><div className="text-sm font-medium">Create support ticket</div><input className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm" placeholder="Ticket title" value={title} onChange={(e)=>setTitle(e.target.value)} /><textarea className="min-h-24 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm" placeholder="Describe the user problem, urgency, and expected outcome" value={description} onChange={(e)=>setDescription(e.target.value)} /><button className="rounded-md border border-border px-3 py-2 text-sm" onClick={()=>createTicket.mutate()} disabled={!title.trim() || createTicket.isPending}>Create ticket</button></div><div className="space-y-3">{tickets.length===0 ? <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">No support tickets yet.</div> : tickets.map((ticket:any)=><div key={ticket.id} className="rounded-lg border border-border bg-card p-4"><div className="flex items-center justify-between gap-3"><div><div className="font-medium">{ticket.title}</div><div className="text-xs text-muted-foreground">{ticket.identifier} · {ticket.status}</div></div><span className="rounded-full border border-border px-2 py-0.5 text-xs">{ticket.priority}</span></div></div>)}</div></div>;
}
