import { api } from "./client";

export const departmentsApi = {
  status: (companyId: string) => api.get<any>(`/companies/${companyId}/departments/status`),
  bootstrap: (companyId: string) => api.post<any>(`/companies/${companyId}/departments/bootstrap`, { apply: true }),
};
