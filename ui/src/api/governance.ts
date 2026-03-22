import { api } from "./client";

type ActionCatalogEntry = Record<string, any>;
type GovernanceActionProposal = Record<string, any>;
type GovernanceRiskAssessment = Record<string, any>;

export const governanceApi = {
  actionCatalog: (companyId: string) => api.get<ActionCatalogEntry[]>(`/companies/${companyId}/governance/action-catalog`),
  evaluateAction: (companyId: string, body: GovernanceActionProposal) => api.post<GovernanceRiskAssessment>(`/companies/${companyId}/governance/evaluate-action`, body),
};
