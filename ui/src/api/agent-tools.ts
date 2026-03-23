import { api } from "../api";

export interface ActiveMissionResponse {
  active: boolean;
  missionId?: string;
  title?: string;
  objectives?: string[];
  autonomyLevel?: "assisted" | "copilot" | "autopilot";
  budgetRemainingUsd?: number;
}

export const agentToolsApi = {
  /**
   * Get current active mission for the company
   */
  async getActiveMission(companyId: string): Promise<ActiveMissionResponse> {
    const response = await api.get<ActiveMissionResponse>(
      `/companies/${companyId}/agent-tools/active-mission`
    );
    return response;
  },

  /**
   * Get company metrics via agent tools
   */
  async getMetrics(companyId: string) {
    return await api.get(
      `/companies/${companyId}/agent-tools/metrics`
    );
  },
  
  /**
   * Propose an action via agent tools
   */
  async proposeAction(companyId: string, missionId: string, opts: { 
    actionType: string; 
    description: string; 
    impactSummary: string;
  }) {
    return await api.post(
      `/companies/${companyId}/agent-tools/propose-action`,
      {
        actionType: opts.actionType,
        description: opts.description,
        impactSummary: opts.impactSummary,
        missionId
      }
    );
  }
};