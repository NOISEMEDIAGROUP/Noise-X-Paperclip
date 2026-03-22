import { api } from "./client";

export const productsApi = {
  list: (companyId: string) => api.get<any[]>(`/companies/${companyId}/products`),
  create: (companyId: string, body: Record<string, unknown>) => api.post<any>(`/companies/${companyId}/products`, body),
  update: (companyId: string, productId: string, body: Record<string, unknown>) => api.patch<any>(`/companies/${companyId}/products/${productId}`, body),
  analytics: (companyId: string, productId: string) => api.get<any>(`/companies/${companyId}/products/${productId}/analytics`),
};
