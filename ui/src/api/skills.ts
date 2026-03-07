import { api } from "./client";

export type SkillScope =
  | "all"
  | "ceo"
  | "cto"
  | "cmo"
  | "cfo"
  | "engineer"
  | "designer"
  | "pm"
  | "qa"
  | "devops"
  | "researcher"
  | "general";

export type SkillSummary = {
  id: string;
  companyId: string;
  name: string;
  label: string;
  description: string | null;
  scope: SkillScope[];
  createdAt: string | null;
  updatedAt: string | null;
  isBuiltin: boolean;
};

export type SkillDetail = SkillSummary & {
  content: string | null;
};

export const skillsApi = {
  list: (companyId: string) => api.get<SkillSummary[]>(`/companies/${companyId}/skills`),
  get: (companyId: string, skillId: string) =>
    api.get<SkillDetail>(`/companies/${companyId}/skills/${skillId}`),
  create: (
    companyId: string,
    data: {
      name: string;
      label: string;
      description?: string | null;
      content: string;
      scope: SkillScope[];
    },
  ) => api.post<SkillSummary>(`/companies/${companyId}/skills`, data),
  remove: (companyId: string, skillId: string) =>
    api.delete<{ ok: true }>(`/companies/${companyId}/skills/${skillId}`),
};
