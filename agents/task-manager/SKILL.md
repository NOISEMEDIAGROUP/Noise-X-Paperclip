---
name: task-manager
description: >
  Manage task lifecycles in Paperclip including creation, delegation, status
  tracking, and completion. Use when creating issues, breaking down work,
  or monitoring task progress across agents.
---

# Task Manager Skill

Use this skill when you need to create, assign, track, or manage tasks (issues) within a Paperclip company.

## Preconditions

You need either:

- Board access, or
- Agent API key with task management permissions (`$PAPERCLIP_API_KEY`)

The company ID must be known (`$PAPERCLIP_COMPANY_ID`).

## Workflow

### 1. Review Current State

List existing issues to understand the current workload:

```bash
curl -sS "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/issues" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

### 2. List Available Agents

Identify agents available for task assignment:

```bash
curl -sS "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/agents" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

### 3. Create a Task

```bash
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/issues" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "<task-title>",
    "description": "## Objective\n\n<what-needs-to-be-done>\n\n## Acceptance Criteria\n\n- [ ] <criterion-1>\n- [ ] <criterion-2>\n- [ ] <criterion-3>",
    "assigneeAgentId": "<agent-id>"
  }'
```

Save the returned issue `id` for tracking.

### 4. Break Down Into Sub-Tasks

For complex work, create sub-issues linked to a parent:

```bash
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/issues" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "<sub-task-title>",
    "body": "<sub-task-description>",
    "parentIssueId": "<parent-issue-id>",
    "assigneeAgentId": "<agent-id>"
  }'
```

### 5. Track Progress

Monitor issue status and comments:

```bash
# Get issue details
curl -sS "$PAPERCLIP_API_URL/api/issues/<issue-id>" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"

# Get issue comments
curl -sS "$PAPERCLIP_API_URL/api/issues/<issue-id>/comments" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

### 6. Add Comments

Provide guidance or feedback on tasks:

```bash
curl -sS -X POST "$PAPERCLIP_API_URL/api/issues/<issue-id>/comments" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "<comment-in-markdown>"
  }'
```

### 7. Update Task Status

```bash
curl -sS -X PATCH "$PAPERCLIP_API_URL/api/issues/<issue-id>" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "<backlog | todo | in_progress | in_review | blocked | done | cancelled>"
  }'
```

### 8. Reassign Tasks

Transfer a task to a different agent:

```bash
curl -sS -X PATCH "$PAPERCLIP_API_URL/api/issues/<issue-id>" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assigneeAgentId": "<new-agent-id>"
  }'
```

## Task Lifecycle

```
Backlog → Todo → In Progress → In Review → Done
                                          → Blocked
                                          → Cancelled
```

- **Backlog**: Task is captured but not yet prioritized
- **Todo**: Task is prioritized and ready for work
- **In Progress**: Agent has checked out the task (atomic checkout)
- **In Review**: Task is completed and awaiting review
- **Blocked**: Task is blocked by a dependency or issue
- **Done**: Task is completed and verified
- **Cancelled**: Task was abandoned or no longer needed

## Quality Bar

When managing tasks:

- [ ] Each task has a clear title and description
- [ ] Acceptance criteria are defined where applicable
- [ ] Tasks are assigned to agents with matching capabilities
- [ ] Complex tasks are broken into sub-tasks
- [ ] Sub-tasks are linked to their parent issue
- [ ] Progress is tracked through comments
- [ ] Completed tasks are verified before closing
- [ ] Delegation follows the org chart reporting lines
