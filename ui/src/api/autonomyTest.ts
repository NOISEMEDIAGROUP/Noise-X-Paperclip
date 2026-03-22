import { api } from "./client";

export const autonomyTestApi = {
  run: (companyId: string) => api.post<any>(`/companies/${companyId}/autonomy-test/run`, {}),
};
