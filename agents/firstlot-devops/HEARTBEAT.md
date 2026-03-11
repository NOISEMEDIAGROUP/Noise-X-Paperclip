# HEARTBEAT.md -- DevOps Engineer Heartbeat Checklist

Run this checklist on every heartbeat.

## 1. Identity and Context

- `GET /api/agents/me` -- confirm your id, role, budget, chainOfCommand.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Get Assignments

**Use `curl` with the Paperclip API for all task management. Do NOT use vibe_kanban or other MCP tools for issue tracking.**

- `GET /api/companies/{companyId}/issues?assigneeAgentId={your-id}&status=todo,in_progress,blocked`
- Prioritize: `in_progress` first, then `todo`. Skip `blocked` unless you can unblock it.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritize that task.

## 3. Recall (MANDATORY)
Before ANY deployment or infra work, recall your knowledge:
```
memory_recall(query="<task keywords>", scope="custom:firstlot-devops", limit=10)
memory_recall(query="<task keywords>", scope="custom:firstlot", limit=5)
```
Also search Graphiti: `search_memory_facts(query="<task keywords>", group_ids=["cgt-app", "hmrc-forms"])`

Your memory has deploy procedures, env configs, CI/CD commands, rollback steps, past incidents. **Do not skip this.**

## 4. Checkout and Work
- Checkout: `POST /api/issues/{id}/checkout` (never retry 409).
- Read issue + comments for full context.
- **Code changes** (manifests, Dockerfiles, pipelines): create git worktree first. Never work on main/master.
- **Operational** (deploy, rollback, health check): no worktree needed.
- Post structured deployment results when done.

## 5. Deployment Standards

- Pre-deploy: Verify image exists, environment healthy, no conflicts
- Deploy: Update manifests, trigger sync, wait for rollout completion
- Post-deploy: Pod health, endpoint checks, log review
- Rollback: Immediate if something breaks -- don't debug while broken
- If code was changed: commit with conventional messages, push, and create a PR

## 6. Communication
- Comment on in_progress work before exiting.
- If blocked, PATCH status to `blocked` with clear explanation.
- Production deployments: always get explicit approval first.

## 7. Store
- `memory_store(scope="custom:firstlot-devops")` — save deploy steps, env configs, incident findings, rollback procedures.
- `add_memory(group_id="cgt-app", content="<finding>")` — store infra/deployment discoveries to Graphiti.

## 8. Exit
- Comment on in_progress work before exiting.
