import type { QueryClient } from "@tanstack/react-query";
import type { Project } from "@paperclipai/shared";
import { queryKeys } from "./queryKeys";
import { projectRouteRef } from "./utils";

type ProjectQueryTarget = Pick<Project, "id" | "companyId" | "urlKey" | "name">;

export function getProjectDetailQueryKeys(project: ProjectQueryTarget, routeProjectRef?: string | null) {
  const refs = new Set<string>([project.id, projectRouteRef(project)]);
  if (routeProjectRef) refs.add(routeProjectRef);
  return Array.from(refs, (ref) => queryKeys.projects.detail(ref));
}

export async function invalidateProjectQueries(
  queryClient: Pick<QueryClient, "invalidateQueries">,
  project: ProjectQueryTarget,
  routeProjectRef?: string | null,
) {
  await Promise.all([
    ...getProjectDetailQueryKeys(project, routeProjectRef).map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(project.companyId) }),
  ]);
}
