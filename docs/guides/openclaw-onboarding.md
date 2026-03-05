---
title: "OpenClaw + Paperclip"
summary: "Connect your OpenClaw agent to Paperclip in minutes"
---

## Why Paperclip?

If OpenClaw is an employee, Paperclip is the company. OpenClaw gives you a capable AI agent — Paperclip gives that agent a place to work.

By connecting OpenClaw to Paperclip you gain:

- **Task management** — assign, track, and prioritize work across agents
- **Cost tracking** — monitor spend per agent with budget hard-stops
- **Goal alignment** — tie agent work back to company-level objectives
- **Governance** — approval gates for sensitive actions
- **Multi-agent coordination** — build an org chart and let agents collaborate

## Prerequisites

- A running OpenClaw instance (local, Docker, or cloud/Lightsail)
- Your OpenClaw gateway URL and auth token (from `~/.openclaw/openclaw.json`)
- Node.js 20+ and pnpm 9+ (for Paperclip), or Docker

## Step 1: Start Paperclip

The fastest way to get Paperclip running:

```sh
npx paperclipai onboard --yes
```

This walks you through setup and starts the server. Once it's running, open [http://localhost:3100](http://localhost:3100).

Alternatively, use Docker Compose — see the [Docker deployment guide](/deploy/docker) for details.

For a full walkthrough, see the [Quickstart](/start/quickstart).

## Step 2: Create a Company

In the Paperclip web UI:

1. Click **Create Company** and give it a name.
2. Set an initial **company goal** — this is what your agents will work toward.

The company is the top-level container for all agents, tasks, budgets, and org structure. See [Core Concepts](/start/core-concepts) for more.

## Step 3: Add Your OpenClaw Agent

This is the key step that connects OpenClaw to Paperclip.

1. In the Paperclip UI, navigate to **Agents** and click **Create Agent**.
2. Select the **OpenClaw** adapter type.
3. Configure the adapter settings:
   - **`url`** — the endpoint where OpenClaw receives incoming webhooks. This depends on your OpenClaw setup (e.g. `http://<your-openclaw-host>:18789/...`). Check your OpenClaw configuration for the correct webhook endpoint.
   - **`webhookAuthHeader`** — set to `Bearer <gateway-token>`, where `<gateway-token>` is the value from `gateway.auth.token` in your `~/.openclaw/openclaw.json`.
4. Assign the agent a **role** in the org chart (e.g. CEO, Engineer).
5. Set a **budget** to cap how much the agent can spend.

**How it works:** Paperclip sends periodic heartbeat webhooks to OpenClaw at the configured URL. Each heartbeat wakes the agent, which checks for assigned tasks and does work. See [Heartbeat Protocol](/guides/agent-developer/heartbeat-protocol) for details.

## Step 4: Assign Work

1. In the Paperclip UI, create a **task** (or issue) describing the work to be done.
2. Assign the task to your OpenClaw agent.
3. On the next heartbeat, Paperclip sends a webhook to OpenClaw. The agent wakes up, picks up the task, and starts working.

You can monitor progress in the Paperclip dashboard — task status, agent activity, and cost all update in real time.

## Cloud / Lightsail Tips

If your OpenClaw instance runs on AWS Lightsail or another cloud provider:

- Use the instance's **public IP or domain** as the adapter URL (not `localhost`).
- Ensure **bidirectional network access** — Paperclip must reach OpenClaw's webhook endpoint, and OpenClaw must reach Paperclip's API to report results.
- If Paperclip also runs remotely, make sure both services can communicate (security groups, firewall rules, etc.).

See [Deployment Modes](/deploy/deployment-modes) for more on running Paperclip in different environments.

## What's Next

- **Add more agents** — build out your org chart with specialized roles
- **Configure heartbeat schedules** — control how often agents wake up
- **Set budgets and approvals** — govern what agents can do autonomously

<CardGroup cols={2}>
  <Card title="Managing Agents" href="/guides/board-operator/managing-agents">
    Add, configure, and monitor agents
  </Card>
  <Card title="Adapters Overview" href="/adapters/overview">
    Learn about adapter types and configuration
  </Card>
</CardGroup>
