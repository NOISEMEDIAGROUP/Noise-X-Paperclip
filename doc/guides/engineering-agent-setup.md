# Engineering Agent Setup Guide

How to configure an engineering agent using the Emisso Sandbox adapter.

## Recommended Adapter Config

```json
{
  "model": "claude-sonnet-4-6",
  "vcpus": 2,
  "timeoutSec": 180,
  "maxTurns": 30,
  "cloneDepth": 1,
  "snapshotId": "",
  "mcpServers": {
    "github": {
      "command": "mcp-server-github",
      "args": ["--token", "$GITHUB_TOKEN"]
    }
  }
}
```

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude API authentication |
| `GITHUB_TOKEN` | For private repos | Git clone authentication |
| `VERCEL_TOKEN` | Non-Vercel hosts | Vercel Sandbox authentication |
| `VERCEL_TEAM_ID` | Non-Vercel hosts | Vercel team for sandbox billing |
| `VERCEL_PROJECT_ID` | Optional | Vercel project scope |

## MCP Server Examples

### GitHub MCP Server

Gives the agent access to GitHub issues, PRs, and repository metadata:

```json
{
  "github": {
    "command": "mcp-server-github",
    "args": ["--token", "$GITHUB_TOKEN"]
  }
}
```

### Supabase MCP Server

Gives the agent access to query the database:

```json
{
  "supabase": {
    "command": "mcp-server-supabase",
    "args": ["--url", "$SUPABASE_URL", "--key", "$SUPABASE_SERVICE_KEY"]
  }
}
```

## Creating an Agent via UI

1. Go to **Agents** → **Create Agent**
2. Set adapter type to **Emisso Sandbox**
3. Configure the model (Sonnet 4.6 recommended for most tasks)
4. Set vCPUs to 2 (increase to 4-8 for complex tasks)
5. Set timeout to 180s (increase for longer-running tasks)
6. Add MCP servers as needed
7. Set the repo URL (or rely on workspace context)
8. Run the environment test to verify configuration

## Snapshots

For faster cold starts, create a snapshot with the CLI pre-installed:

1. Create a sandbox manually with `@vercel/sandbox`
2. Install Claude Code: `npm install -g @anthropic-ai/claude-code`
3. Create a snapshot: `sandbox.snapshot()`
4. Use the returned `snapshotId` in the agent config

This reduces sandbox startup from ~60s to ~5s.

## Workspace Strategy

The adapter resolves the repo URL in this order:

1. `adapterConfig.repoUrl` (explicit override)
2. `context.paperclipWorkspace.repoUrl` (from project workspace)
3. Falls back with an error if neither is set

For project-scoped agents, the workspace context is automatically provided
by Paperclip when assigning issues from a project with a configured workspace.
