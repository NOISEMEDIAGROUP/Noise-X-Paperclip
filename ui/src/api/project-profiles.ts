import type { ProjectProfile, ProjectIntegration, ProjectScraper } from "@paperclipai/shared";
import { api } from "./client";

function profilePath(projectId: string, suffix = "") {
  return `/projects/${encodeURIComponent(projectId)}${suffix}`;
}

export const projectProfilesApi = {
  get: (projectId: string) =>
    api.get<ProjectProfile>(profilePath(projectId, "/profile")),

  upsert: (projectId: string, data: Record<string, unknown>) =>
    api.put<ProjectProfile>(profilePath(projectId, "/profile"), data),

  update: (projectId: string, data: Record<string, unknown>) =>
    api.patch<ProjectProfile>(profilePath(projectId, "/profile"), data),

  listIntegrations: (projectId: string) =>
    api.get<ProjectIntegration[]>(profilePath(projectId, "/integrations")),

  addIntegration: (projectId: string, data: Record<string, unknown>) =>
    api.post<ProjectIntegration>(profilePath(projectId, "/integrations"), data),

  removeIntegration: (projectId: string, integrationId: string) =>
    api.delete<ProjectIntegration>(
      profilePath(projectId, `/integrations/${encodeURIComponent(integrationId)}`),
    ),

  listScrapers: (projectId: string) =>
    api.get<ProjectScraper[]>(profilePath(projectId, "/scrapers")),

  addScraper: (projectId: string, data: Record<string, unknown>) =>
    api.post<ProjectScraper>(profilePath(projectId, "/scrapers"), data),

  removeScraper: (projectId: string, scraperId: string) =>
    api.delete<ProjectScraper>(
      profilePath(projectId, `/scrapers/${encodeURIComponent(scraperId)}`),
    ),
};
