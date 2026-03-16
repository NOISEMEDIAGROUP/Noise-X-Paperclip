import { Router, type Request, type Response } from "express";
import type { Db } from "@paperclipai/db";
import { createMCPService } from "../services/mcp.js";
import { logger } from "../middleware/logger.js";

export function mcpRoutes(db: Db) {
  const router = Router({ mergeParams: true });

  // Middleware - check company access
  const checkCompanyAccess = async (req: Request, res: Response, next: Function) => {
    try {
      const companyId = (req.params as any).companyId as string;
      const companyIds = ((req.actor as any).companyIds || []) as string[];
      if (!companyIds.includes(companyId)) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      next();
    } catch (error) {
      logger.error(`Middleware error: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  // ============ MCP SERVERS ============

  // POST /companies/:companyId/mcp/servers
  router.post(
    "/:companyId/mcp/servers",
    checkCompanyAccess,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req.params as any).companyId as string;
        const { name, type, protocol, command, url, environment, configuration } = req.body;

        const mcpService = createMCPService(db);
        const server = await mcpService.createMCPServer(companyId, {
          name,
          type,
          protocol,
          command,
          url,
          environment,
          configuration,
        });

        res.status(201).json(server);
      } catch (error) {
        logger.error(`Failed to create MCP server: ${error}`);
        res.status(500).json({ error: "Failed to create MCP server" });
      }
    }
  );

  // GET /companies/:companyId/mcp/servers
  router.get(
    "/:companyId/mcp/servers",
    checkCompanyAccess,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req.params as any).companyId as string;
        const mcpService = createMCPService(db);
        const servers = await mcpService.listMCPServers(companyId);
        res.json(servers);
      } catch (error) {
        logger.error(`Failed to list MCP servers: ${error}`);
        res.status(500).json({ error: "Failed to list MCP servers" });
      }
    }
  );

  // PATCH /companies/:companyId/mcp/servers/:serverId
  router.patch(
    "/:companyId/mcp/servers/:serverId",
    checkCompanyAccess,
    async (req: Request, res: Response) => {
      try {
        const serverId = (req.params as any).serverId as string;
        const { name, enabled, healthStatus, errorMessage } = req.body;

        const mcpService = createMCPService(db);
        const server = await mcpService.updateMCPServer(serverId, {
          name,
          enabled,
          healthStatus,
          errorMessage,
        });

        res.json(server);
      } catch (error) {
        logger.error(`Failed to update MCP server: ${error}`);
        res.status(500).json({ error: "Failed to update MCP server" });
      }
    }
  );

  // DELETE /companies/:companyId/mcp/servers/:serverId
  router.delete(
    "/:companyId/mcp/servers/:serverId",
    checkCompanyAccess,
    async (req: Request, res: Response) => {
      try {
        const serverId = (req.params as any).serverId as string;
        const mcpService = createMCPService(db);
        await mcpService.deleteMCPServer(serverId);
        res.status(204).send();
      } catch (error) {
        logger.error(`Failed to delete MCP server: ${error}`);
        res.status(500).json({ error: "Failed to delete MCP server" });
      }
    }
  );

  // ============ EXTERNAL API INTEGRATIONS ============

  // POST /companies/:companyId/mcp/apis
  router.post(
    "/:companyId/mcp/apis",
    checkCompanyAccess,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req.params as any).companyId as string;
        const { provider, name, apiEndpoint, authenticationType, credentials, scope, rateLimit, timeoutSeconds, retryPolicy } = req.body;

        const mcpService = createMCPService(db);
        const api = await mcpService.createExternalAPI(companyId, {
          provider,
          name,
          apiEndpoint,
          authenticationType,
          credentials,
          scope,
          rateLimit,
          timeoutSeconds,
          retryPolicy,
        });

        res.status(201).json(api);
      } catch (error) {
        logger.error(`Failed to create external API: ${error}`);
        res.status(500).json({ error: "Failed to create external API" });
      }
    }
  );

  // GET /companies/:companyId/mcp/apis
  router.get(
    "/:companyId/mcp/apis",
    checkCompanyAccess,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req.params as any).companyId as string;
        const mcpService = createMCPService(db);
        const apis = await mcpService.listExternalAPIs(companyId);
        res.json(apis);
      } catch (error) {
        logger.error(`Failed to list external APIs: ${error}`);
        res.status(500).json({ error: "Failed to list external APIs" });
      }
    }
  );

  // POST /companies/:companyId/mcp/apis/:apiId/test
  router.post(
    "/:companyId/mcp/apis/:apiId/test",
    checkCompanyAccess,
    async (req: Request, res: Response) => {
      try {
        const apiId = (req.params as any).apiId as string;
        const mcpService = createMCPService(db);
        const result = await mcpService.testExternalAPI(apiId);
        res.json(result);
      } catch (error) {
        logger.error(`Failed to test external API: ${error}`);
        res.status(500).json({ error: "Failed to test external API" });
      }
    }
  );

  // DELETE /companies/:companyId/mcp/apis/:apiId
  router.delete(
    "/:companyId/mcp/apis/:apiId",
    checkCompanyAccess,
    async (req: Request, res: Response) => {
      try {
        const apiId = (req.params as any).apiId as string;
        const mcpService = createMCPService(db);
        await mcpService.deleteExternalAPI(apiId);
        res.status(204).send();
      } catch (error) {
        logger.error(`Failed to delete external API: ${error}`);
        res.status(500).json({ error: "Failed to delete external API" });
      }
    }
  );

  // ============ AGENT API ASSOCIATIONS ============

  // POST /agents/:agentId/mcp/link
  router.post("/agents/:agentId/mcp/link", async (req: Request, res: Response) => {
    try {
      const agentId = (req.params as any).agentId as string;
      const { mcpServerId, apiIntegrationId, configuration } = req.body;

      const mcpService = createMCPService(db);
      const association = await mcpService.linkAgentToAPI(
        agentId,
        mcpServerId,
        apiIntegrationId,
        configuration
      );

      res.status(201).json(association);
    } catch (error) {
      logger.error(`Failed to link agent to API: ${error}`);
      res.status(500).json({ error: "Failed to link agent to API" });
    }
  });

  // GET /agents/:agentId/mcp/associations
  router.get("/agents/:agentId/mcp/associations", async (req: Request, res: Response) => {
    try {
      const agentId = (req.params as any).agentId as string;
      const mcpService = createMCPService(db);
      const associations = await mcpService.getAgentAssociations(agentId);
      res.json(associations);
    } catch (error) {
      logger.error(`Failed to get agent associations: ${error}`);
      res.status(500).json({ error: "Failed to get agent associations" });
    }
  });

  return router;
}
