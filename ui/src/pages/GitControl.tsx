import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { projectsApi } from "../api/projects";
import { queryKeys } from "../lib/queryKeys";
import { WorkspaceGitControl } from "../components/WorkspaceGitControl";
import { PageSkeleton } from "../components/PageSkeleton";
import { EmptyState } from "../components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { GitBranch, FolderGit2 } from "lucide-react";
import type { Project } from "@paperclipai/shared";

function ProjectGitSection({ project }: { project: Project }) {
  const workspacesWithCwd = project.workspaces.filter((w) => w.cwd);
  if (workspacesWithCwd.length === 0) return null;

  return (
    <div className="rounded-md border border-border">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-muted/20">
        <div
          className="w-2.5 h-2.5 rounded-sm shrink-0"
          style={{ backgroundColor: project.color ?? "#6366f1" }}
        />
        <span className="text-sm font-medium truncate">{project.name}</span>
        <Badge variant="outline" className="text-[10px] font-normal ml-auto">
          {workspacesWithCwd.length} workspace{workspacesWithCwd.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="divide-y divide-border">
        {workspacesWithCwd.map((workspace) => (
          <div key={workspace.id} className="px-3 py-3">
            <div className="flex items-center gap-2 mb-2">
              <FolderGit2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium truncate">{workspace.name}</span>
              {workspace.isPrimary && (
                <Badge variant="secondary" className="text-[10px] font-normal">primary</Badge>
              )}
              <code className="text-[10px] text-muted-foreground font-mono ml-auto truncate max-w-[300px]">
                {workspace.cwd}
              </code>
            </div>
            <WorkspaceGitControl workspace={workspace} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function GitControl() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: "Git" }]);
  }, [setBreadcrumbs]);

  const { data: projects, isLoading } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  if (!selectedCompanyId) {
    return <EmptyState icon={GitBranch} message="Select a company to view git controls" />;
  }

  if (isLoading) return <PageSkeleton variant="list" />;

  const projectsWithGit = (projects ?? []).filter(
    (p) => p.workspaces.some((w) => w.cwd),
  );

  if (projectsWithGit.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Git</h1>
        </div>
        <EmptyState
          icon={GitBranch}
          message="No projects with local workspaces. Create a project with a local directory to use git controls."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Git</h1>
      </div>

      <div className="space-y-4">
        {projectsWithGit.map((project) => (
          <ProjectGitSection key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
