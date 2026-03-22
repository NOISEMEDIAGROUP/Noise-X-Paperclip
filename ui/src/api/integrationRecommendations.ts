import { api } from "./client";
import type {
  GetBlocksResponse,
  GetRecommendationsResponse,
  GetCatalogResponse,
  CreateRecommendationRequest,
  IntegrationBlock,
  IntegrationRecommendation,
} from "@paperclipai/shared";

export const integrationRecommendationsApi = {
  // Get integration catalog
  catalog: async (): Promise<GetCatalogResponse> => {
    return api.get("/integrations/catalog");
  },

  // Get integration blocks for a company
  getBlocks: async (companyId: string): Promise<GetBlocksResponse> => {
    return api.get(`/companies/${companyId}/integration-blocks`);
  },

  // Dismiss an integration block
  dismissBlock: async (
    companyId: string,
    blockId: string
  ): Promise<IntegrationBlock> => {
    return api.post(
      `/companies/${companyId}/integration-blocks/${blockId}/dismiss`,
      {}
    );
  },

  // Resolve an integration block
  resolveBlock: async (
    companyId: string,
    blockId: string
  ): Promise<IntegrationBlock> => {
    return api.post(
      `/companies/${companyId}/integration-blocks/${blockId}/resolve`,
      {}
    );
  },

  // Get recommendations for a company
  getRecommendations: async (
    companyId: string
  ): Promise<GetRecommendationsResponse> => {
    return api.get(
      `/companies/${companyId}/integration-recommendations`
    );
  },

  // Create a recommendation
  createRecommendation: async (
    companyId: string,
    data: CreateRecommendationRequest
  ): Promise<IntegrationRecommendation> => {
    return api.post(
      `/companies/${companyId}/integration-recommendations`,
      data
    );
  },

  // Dismiss a recommendation
  dismissRecommendation: async (
    companyId: string,
    recId: string
  ): Promise<IntegrationRecommendation> => {
    return api.post(
      `/companies/${companyId}/integration-recommendations/${recId}/dismiss`,
      {}
    );
  },

  // Mark a recommendation as connected
  connectRecommendation: async (
    companyId: string,
    recId: string
  ): Promise<IntegrationRecommendation> => {
    return api.post(
      `/companies/${companyId}/integration-recommendations/${recId}/connect`,
      {}
    );
  },
};