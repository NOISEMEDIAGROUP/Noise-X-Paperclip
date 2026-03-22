import { api } from "./client";

type CompanyObjective = Record<string, any>;
type CreateObjectivePayload = Record<string, any>;
type UpdateObjectivePayload = Record<string, any>;
type CreateKeyResultPayload = Record<string, any>;
type KeyResult = Record<string, any>;
type UpdateKeyResultPayload = Record<string, any>;

export const objectivesApi = {
  list: (companyId: string) => api.get<CompanyObjective[]>(`/companies/${companyId}/objectives`),
  create: (companyId: string, body: CreateObjectivePayload) => api.post<CompanyObjective>(`/companies/${companyId}/objectives`, body),
  update: (companyId: string, objectiveId: string, body: UpdateObjectivePayload) => api.patch<CompanyObjective>(`/companies/${companyId}/objectives/${objectiveId}`, body),
  remove: (companyId: string, objectiveId: string) => api.delete<void>(`/companies/${companyId}/objectives/${objectiveId}`),
  createKeyResult: (companyId: string, objectiveId: string, body: CreateKeyResultPayload) => api.post<KeyResult>(`/companies/${companyId}/objectives/${objectiveId}/key-results`, body),
  updateKeyResult: (companyId: string, objectiveId: string, keyResultId: string, body: UpdateKeyResultPayload) => api.patch<KeyResult>(`/companies/${companyId}/objectives/${objectiveId}/key-results/${keyResultId}`, body),
};
