import type { Db } from "@paperclipai/db";
import {
  mcpServers,
  externalApiIntegrations,
  customAdapters,
  mcpTools,
  mcpResources,
  agentApiAssociations,
  apiEventSubscriptions,
} from "@paperclipai/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../middleware/logger.js";

export interface MCPServerConfig {
  name: string;
  type: "mcp" | "external_api";
  protocol?: "stdio" | "sse" | "http";
  command?: string;
  url?: string;
  environment?: Record<string, string>;
  configuration: Record<string, unknown>;
}

export interface ExternalAPIConfig {
  provider: string;
  name: string;
  apiEndpoint: string;
  authenticationType: "oauth" | "api_key" | "bearer_token" | "basic";
  credentials: Record<string, unknown>;
  scope?: string[];
  rateLimit?: number;
  timeoutSeconds?: number;
  retryPolicy?: Record<string, unknown>;
}

export class MCPService {
  constructor(private db: Db) {}

  /**
   * Create MCP Server
   */
  async createMCPServer(companyId: string, config: MCPServerConfig) {
    try {
      const [server] = await this.db
        .insert(mcpServers)
        .values({
          companyId,
          name: config.name,
          type: config.type,
          protocol: config.protocol,
          command: config.command,
          url: config.url,
          environment: config.environment,
          configuration: config.configuration,
          enabled: true,
          healthStatus: "unknown",
        })
        .returning();

      logger.info(`Created MCP server: ${server.id}`);
      return server;
    } catch (error) {
      logger.error(`Failed to create MCP server: ${error}`);
      throw error;
    }
  }

  /**
   * List MCP Servers
   */
  async listMCPServers(companyId: string) {
    try {
      return await this.db.query.mcpServers.findMany({
        where: eq(mcpServers.companyId, companyId),
      });
    } catch (error) {
      logger.error(`Failed to list MCP servers: ${error}`);
      throw error;
    }
  }

  /**
   * Update MCP Server
   */
  async updateMCPServer(
    serverId: string,
    updates: {
      name?: string;
      enabled?: boolean;
      healthStatus?: string;
      errorMessage?: string | null;
    }
  ) {
    try {
      const updateData: Record<string, any> = {
        lastHealthCheck: new Date(),
        updatedAt: new Date(),
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
      if (updates.healthStatus !== undefined) updateData.healthStatus = updates.healthStatus;
      if (updates.errorMessage !== undefined) updateData.errorMessage = updates.errorMessage;

      const [server] = await this.db
        .update(mcpServers)
        .set(updateData)
        .where(eq(mcpServers.id, serverId))
        .returning();

      logger.info(`Updated MCP server: ${serverId}`);
      return server;
    } catch (error) {
      logger.error(`Failed to update MCP server: ${error}`);
      throw error;
    }
  }

  /**
   * Delete MCP Server
   */
  async deleteMCPServer(serverId: string) {
    try {
      await this.db.delete(mcpServers).where(eq(mcpServers.id, serverId));
      logger.info(`Deleted MCP server: ${serverId}`);
    } catch (error) {
      logger.error(`Failed to delete MCP server: ${error}`);
      throw error;
    }
  }

  /**
   * Create External API Integration
   */
  async createExternalAPI(companyId: string, config: ExternalAPIConfig) {
    try {
      const [integration] = await this.db
        .insert(externalApiIntegrations)
        .values({
          companyId,
          provider: config.provider,
          name: config.name,
          apiEndpoint: config.apiEndpoint,
          authenticationType: config.authenticationType,
          credentials: config.credentials,
          scope: config.scope,
          rateLimit: config.rateLimit,
          timeoutSeconds: config.timeoutSeconds || 30,
          retryPolicy: config.retryPolicy,
          enabled: true,
          testStatus: "never_tested",
        })
        .returning();

      logger.info(`Created external API integration: ${integration.id}`);
      return integration;
    } catch (error) {
      logger.error(`Failed to create external API: ${error}`);
      throw error;
    }
  }

  /**
   * List External APIs
   */
  async listExternalAPIs(companyId: string) {
    try {
      return await this.db.query.externalApiIntegrations.findMany({
        where: eq(externalApiIntegrations.companyId, companyId),
      });
    } catch (error) {
      logger.error(`Failed to list external APIs: ${error}`);
      throw error;
    }
  }

  /**
   * Test External API Connection
   */
  async testExternalAPI(integrationId: string) {
    try {
      const integration = await this.db.query.externalApiIntegrations.findFirst({
        where: eq(externalApiIntegrations.id, integrationId),
      });

      if (!integration) {
        return { success: false, error: "Integration not found" };
      }

      // Perform basic health check
      try {
        const headers: Record<string, string> = {
          "User-Agent": "Paperclip/1.0",
        };

        if (integration.authenticationType === "api_key") {
          headers["X-API-Key"] = integration.credentials.apiKey as string;
        } else if (integration.authenticationType === "bearer_token") {
          headers["Authorization"] = `Bearer ${integration.credentials.token}`;
        }

        const controller = new AbortController();
        const timeoutMs = (integration.timeoutSeconds || 30) * 1000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(integration.apiEndpoint, {
          method: "GET",
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const status = response.ok ? "success" : "failed";

        // Update test status
        await this.db
          .update(externalApiIntegrations)
          .set({
            testStatus: status,
            lastTestedAt: new Date(),
            errorMessage: response.ok ? null : `HTTP ${response.status}`,
          })
          .where(eq(externalApiIntegrations.id, integrationId));

        return { success: response.ok };
      } catch (error) {
        await this.db
          .update(externalApiIntegrations)
          .set({
            testStatus: "failed",
            lastTestedAt: new Date(),
            errorMessage: String(error),
          })
          .where(eq(externalApiIntegrations.id, integrationId));

        return { success: false, error: String(error) };
      }
    } catch (error) {
      logger.error(`Failed to test external API: ${error}`);
      throw error;
    }
  }

  /**
   * Delete External API Integration
   */
  async deleteExternalAPI(integrationId: string) {
    try {
      await this.db
        .delete(externalApiIntegrations)
        .where(eq(externalApiIntegrations.id, integrationId));
      logger.info(`Deleted external API: ${integrationId}`);
    } catch (error) {
      logger.error(`Failed to delete external API: ${error}`);
      throw error;
    }
  }

  /**
   * Create Custom Adapter
   */
  async createCustomAdapter(
    companyId: string,
    data: {
      name: string;
      description?: string;
      adapterType: "tool" | "resource" | "transformer";
      sourceCode: string;
      language?: string;
      authorId?: string;
    }
  ) {
    try {
      const [adapter] = await this.db
        .insert(customAdapters)
        .values({
          companyId,
          name: data.name,
          description: data.description,
          adapterType: data.adapterType,
          sourceCode: data.sourceCode,
          language: data.language || "javascript",
          isEnabled: true,
          version: "1.0.0",
          authorId: data.authorId,
        })
        .returning();

      logger.info(`Created custom adapter: ${adapter.id}`);
      return adapter;
    } catch (error) {
      logger.error(`Failed to create custom adapter: ${error}`);
      throw error;
    }
  }

  /**
   * List Custom Adapters
   */
  async listCustomAdapters(companyId: string) {
    try {
      return await this.db.query.customAdapters.findMany({
        where: eq(customAdapters.companyId, companyId),
      });
    } catch (error) {
      logger.error(`Failed to list custom adapters: ${error}`);
      throw error;
    }
  }

  /**
   * Link Agent to MCP/API
   */
  async linkAgentToAPI(
    agentId: string,
    mcpServerId?: string,
    apiIntegrationId?: string,
    configuration?: Record<string, unknown>
  ) {
    try {
      const [association] = await this.db
        .insert(agentApiAssociations)
        .values({
          agentId,
          mcpServerId,
          apiIntegrationId,
          enabled: true,
          configuration,
        })
        .returning();

      logger.info(`Linked agent ${agentId} to API/MCP`);
      return association;
    } catch (error) {
      logger.error(`Failed to link agent to API: ${error}`);
      throw error;
    }
  }

  /**
   * Get Agent API Associations
   */
  async getAgentAssociations(agentId: string) {
    try {
      return await this.db.query.agentApiAssociations.findMany({
        where: eq(agentApiAssociations.agentId, agentId),
      });
    } catch (error) {
      logger.error(`Failed to get agent associations: ${error}`);
      throw error;
    }
  }

  /**
   * Subscribe to API Events
   */
  async subscribeToEvent(
    integrationId: string,
    agentId: string,
    eventType: string,
    filter?: Record<string, unknown>
  ) {
    try {
      const [subscription] = await this.db
        .insert(apiEventSubscriptions)
        .values({
          integrationId,
          agentId,
          eventType,
          filter,
          enabled: true,
        })
        .returning();

      logger.info(`Created event subscription: ${subscription.id}`);
      return subscription;
    } catch (error) {
      logger.error(`Failed to subscribe to event: ${error}`);
      throw error;
    }
  }
}

/**
 * Factory function for MCPService
 */
export function createMCPService(db: Db): MCPService {
  return new MCPService(db);
}
