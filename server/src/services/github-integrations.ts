// @ts-nocheck
import { businessConfigService } from "./business-config.js";
import { secretService } from "./secrets.js";
function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function repoUrl(config) {
  if (!hasText(config.githubRepoOwner) || !hasText(config.githubRepoName)) return null;
  return `https://github.com/${config.githubRepoOwner}/${config.githubRepoName}`;
}
function githubIntegrationService(db) {
  const configs = businessConfigService(db);
  const secrets = secretService(db);
  return {
    async status(companyId) {
      const config = await configs.get(companyId);
      const token = await secrets.resolveSecretValueByName(companyId, config.githubTokenSecretName);
      const tokenPresent = Boolean(token && token.trim().length > 0);
      const repoConfigured = hasText(config.githubRepoOwner) && hasText(config.githubRepoName);
      const repositoryUrl = repoUrl(config);
      const github = {
        tokenPresent,
        repoConfigured,
        repositoryUrl,
        status: repoConfigured && tokenPresent ? "connected" : repoConfigured || tokenPresent ? "partial" : "not_configured"
      };
      const githubActions = {
        enabled: repoConfigured,
        repositoryUrl,
        workflowName: config.githubActionsWorkflowName ?? null,
        status: repoConfigured ? "partial" : "not_configured",
        latestRun: null,
        error: null
      };
      if (!repoConfigured || !config.githubRepoOwner || !config.githubRepoName) {
        return { github, githubActions };
      }
      try {
        const headers = {
          Accept: "application/vnd.github+json",
          "User-Agent": "paperclip-phase5-integration-check"
        };
        if (tokenPresent && token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const params = new URLSearchParams({ per_page: "1" });
        if (hasText(config.githubActionsWorkflowName)) {
          params.set("workflow_id", config.githubActionsWorkflowName.trim());
        }
        const response = await fetch(
          `https://api.github.com/repos/${config.githubRepoOwner}/${config.githubRepoName}/actions/runs?${params.toString()}`,
          { headers }
        );
        if (!response.ok) {
          githubActions.status = tokenPresent && repoConfigured ? "partial" : "not_configured";
          githubActions.error = `GitHub Actions API error: ${response.status}`;
          return { github, githubActions };
        }
        const payload = await response.json();
        const latest = payload.workflow_runs?.[0] ?? null;
        githubActions.latestRun = latest ? {
          name: latest.name ?? "Workflow run",
          status: latest.status ?? "unknown",
          conclusion: latest.conclusion ?? null,
          htmlUrl: latest.html_url ?? null,
          updatedAt: latest.updated_at ?? null
        } : null;
        githubActions.status = repoConfigured ? "connected" : "not_configured";
        return { github, githubActions };
      } catch (error) {
        githubActions.status = tokenPresent && repoConfigured ? "partial" : "not_configured";
        githubActions.error = error instanceof Error ? error.message : String(error);
        return { github, githubActions };
      }
    }
  };
}
export {
  githubIntegrationService
};
