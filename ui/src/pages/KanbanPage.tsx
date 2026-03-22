import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useDialog } from "../context/DialogContext";
import { queryKeys } from "../lib/queryKeys";
import { issuesApi } from "../api/issues";
import { agentsApi } from "../api/agents";
import { projectsApi } from "../api/projects";
import { KanbanBoard } from "../components/KanbanBoard";
import { PageSkeleton } from "../components/PageSkeleton";
import { EmptyState } from "../components/EmptyState";
import { Kanban } from "lucide-react";
import type { Issue, Agent } from "@paperclipai/shared";

export function KanbanPage() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { openNewIssue } = useDialog();
  const queryClient = useQueryClient();

  useEffect(() => {
    setBreadcrumbs([
      { label: "Kanban" },
    ]);
  }, [setBreadcrumbs]);

  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const updateIssueMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      issuesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(selectedCompanyId!) });
    },
  });

  const handleUpdateIssue = (id: string, data: Record<string, unknown>) => {
    updateIssueMutation.mutate({ id, data });
  };

  const handleNewIssue = (status: string) => {
    openNewIssue({ status });
  };

  if (!selectedCompanyId) {
    return <EmptyState icon={Kanban} message="Select a company to view the kanban board." />;
  }

  if (issuesLoading) {
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b">
        <h1 className="text-2xl font-semibold tracking-tight">Kanban Board</h1>
        <p className="text-sm text-muted-foreground">
          Drag and drop issues to change their status
        </p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {issues && issues.length > 0 ? (
          <KanbanBoard
            issues={issues}
            agents={agents as Agent[]}
            onUpdateIssue={handleUpdateIssue}
          />
        ) : (
          <div className="text-center py-12">
            <Kanban className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              No issues yet. Create an issue to see it on the board.
            </p>
            <a
              href={`/${selectedCompanyId}/issues`}
              className="text-sm text-primary hover:underline"
            >
              Go to Tasks
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
