# PRD: Paperclip ↔ Plane Integration

**Product:** Paperclip-Plane Sync Service  
**Version:** 1.0  
**Status:** Draft  
**Created:** 2026-03-07  
**Author:** Jarvis Leader  
**Stakeholders:** Monte (Product Owner)

---

## Executive Summary

**Problem:** Paperclip provides excellent agent orchestration but lacks a human-friendly project management interface. Stakeholders without technical background struggle to monitor agent work in Paperclip's developer-focused UI.

**Solution:** Bidirectional sync between Paperclip (agent orchestration) and Plane (project management), treating AI agents as first-class assignees via Plane's bot user system.

**Outcome:** 
- Non-technical stakeholders view agent work in Plane's intuitive UI
- Agents can be assigned work items directly in Plane
- Full visibility into agent task status, comments, and progress
- Zero risk of lost tasks (UUID validation)

**Timeline:** 2 weeks (80 hours)  
**Risk Level:** Low (uses official Plane App architecture)

---

## Background

### Current State

**Paperclip:**
- Agent orchestration platform
- Built-in ticket system (issues)
- AI agent management (hire, pause, budgets)
- Heartbeat scheduling
- Governance/approval workflows
- Developer-focused UI

**Plane:**
- Modern project management
- Human-friendly interface
- Initiatives, epics, work items
- Custom workflows
- Plane Apps (bot users)
- Stakeholder-friendly UI

**Gap:** Non-technical team members can't easily:
- See what agents are working on
- Assign work to specific agents
- Track agent progress
- View agent-generated reports

### Why Not Build on Plane Only?

Plane lacks:
- Agent lifecycle management
- Heartbeat scheduling
- Budget enforcement
- Execution context tracking
- Goal alignment hierarchy

Paperclip is purpose-built for AI agent orchestration. Plane is purpose-built for human project management. This integration combines the best of both.

---

## Product Vision

**"Agents as Team Members"**

AI agents appear as team members in Plane:
- Assign work items to "Coder Agent" or "Sally Designer"
- @mention agents in comments
- See agent workload across projects
- Track agent task completion
- View agent-generated artifacts

Behind the scenes:
- Paperclip orchestrates agent execution
- Heartbeats trigger agent work
- Budgets enforce cost control
- Governance ensures oversight

**User Experience:**

1. **Product Manager** assigns "Implement login feature" to "Coder Agent" in Plane
2. **Sync Service** detects assignment, triggers Paperclip agent
3. **Coder Agent** wakes up, claims task, executes work
4. **Sync Service** updates Plane with progress (status changes, comments)
5. **Product Manager** sees real-time updates in Plane UI
6. **Product Manager** reviews completed work, marks as done in Plane
7. **Sync Service** syncs status back to Paperclip

---

## Goals & Success Metrics

### Goals

1. **Visibility:** Non-technical stakeholders can monitor agent work in Plane
2. **Assignability:** Humans can assign work to agents via Plane
3. **Traceability:** Full bidirectional sync of status, comments, assignments
4. **Reliability:** No lost tasks, no sync failures, no data corruption
5. **Maintainability:** Easy to debug, monitor, and extend

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Sync latency | < 5 seconds | Time from Paperclip change → Plane update |
| Sync reliability | 99.9% | Successful syncs / total sync attempts |
| Task visibility | 100% | All Paperclip issues visible in Plane |
| Assignment success | 100% | Valid assignments trigger agent execution |
| User adoption | > 80% | Stakeholders using Plane vs Paperclip UI |

---

## User Stories

### Stakeholder Personas

**Persona 1: Product Manager (Non-technical)**
- Wants to see what agents are working on
- Wants to assign features to specific agents
- Wants to track progress without learning Paperclip

**Persona 2: Engineering Lead (Technical)**
- Wants to monitor agent workload
- Wants to reassign tasks between agents
- Wants to debug failed agent executions

**Persona 3: Executive (C-level)**
- Wants high-level progress dashboards
- Wants to see agent utilization
- Wants to review completed work

### User Stories

**Epic 1: Issue Sync**

```
As a Product Manager,
I want all Paperclip issues to appear in Plane,
So that I can view and organize agent work in a familiar interface.

Acceptance Criteria:
- Given a new issue is created in Paperclip
- When the sync service runs
- Then a corresponding work item appears in Plane
- And the work item has correct title, description, status
- And the work item is assigned to the correct agent (if any)
```

**Epic 2: Agent Assignment**

```
As a Product Manager,
I want to assign a work item to an agent in Plane,
So that the agent will start working on it automatically.

Acceptance Criteria:
- Given I assign a work item to "Coder Agent" in Plane
- When the webhook triggers
- Then the corresponding Paperclip issue is assigned to the coder agent
- And the coder agent's heartbeat is triggered
- And the agent begins execution
```

**Epic 3: Status Sync**

```
As a Product Manager,
I want to see agent progress in real-time in Plane,
So that I know the current state of work.

Acceptance Criteria:
- Given an agent changes issue status to "in_progress" in Paperclip
- When the sync service runs
- Then the Plane work item status updates to "In Progress"
- And the update happens within 5 seconds
```

**Epic 4: Comment Sync**

```
As an Engineering Lead,
I want to see agent comments in Plane,
So that I understand agent decisions and progress.

Acceptance Criteria:
- Given an agent adds a comment to an issue in Paperclip
- When the sync service runs
- Then the comment appears on the Plane work item
- And the comment shows the agent name and timestamp
```

**Epic 5: Error Handling**

```
As an Engineering Lead,
I want to be notified when sync fails,
So that I can investigate and fix issues.

Acceptance Criteria:
- Given a sync operation fails
- When the error occurs
- Then an error is logged to Paperclip
- And the error includes full context (issue ID, operation, error message)
- And retry logic attempts 3 times with exponential backoff
```

---

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Paperclip Instance                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Agents  │  │  Issues  │  │Heartbeats│  │   Runs   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│       │              │              │              │        │
│       └──────────────┴──────────────┴──────────────┘        │
│                           │                                  │
│                    PostgreSQL DB                             │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            │ DB Polling (every 5 sec)
                            │
                    ┌───────▼────────┐
                    │  Sync Service  │
                    │   (Node.js)    │
                    │                │
                    │  - Paperclip   │
                    │    Poller      │
                    │  - Plane API   │
                    │    Client      │
                    │  - Webhook     │
                    │    Handler     │
                    │  - Conflict    │
                    │    Resolver    │
                    └───────┬────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
      Plane API (REST)           Plane Webhooks
              │                           │
    ┌─────────▼─────────┐         ┌──────▼──────┐
    │  Plane Workspace  │         │  HTTP POST  │
    │                   │         │  /webhooks  │
    │  ┌─────────────┐  │         │  /plane     │
    │  │ Bot Users   │  │         └─────────────┘
    │  │ - Coder     │  │
    │  │ - Sally     │  │
    │  │ - Mike      │  │
    │  └─────────────┘  │
    │                   │
    │  ┌─────────────┐  │
    │  │ Work Items  │  │
    │  │ - PROJ-1    │  │
    │  │ - PROJ-2    │  │
    │  └─────────────┘  │
    └───────────────────┘
```

### Data Flow

**Paperclip → Plane (Polling):**

1. Sync Service queries Paperclip DB every 5 seconds
2. Find issues where `updated_at > last_sync_time`
3. For each changed issue:
   - Map Paperclip fields → Plane work item fields
   - Check if Plane work item exists (via `external_id`)
   - Create or update Plane work item via API
   - Store sync metadata (last sync time, Plane ID)
4. Log sync results to Paperclip

**Plane → Paperclip (Webhooks):**

1. User updates work item in Plane
2. Plane sends webhook to Sync Service
3. Sync Service validates webhook signature
4. Extract `external_id` (Paperclip issue ID)
5. Map Plane fields → Paperclip issue fields
6. Update Paperclip DB directly
7. If assignment changed, trigger agent heartbeat
8. Return 200 OK to Plane

---

## Data Model Mapping

### Paperclip Issue → Plane Work Item

| Paperclip Field | Plane Field | Transformation | Notes |
|----------------|-------------|----------------|-------|
| `id` | `external_id` | Direct copy | Used for deduplication |
| `companyId` | `workspace_id` | 1:1 mapping | Config-based |
| `projectId` | `project_id` | 1:1 mapping | Config-based |
| `goalId` | `parent` | Goal → Epic ID | Optional, needs mapping |
| `title` | `name` | Direct copy | |
| `description` | `description_html` | Markdown → HTML | Use markdown-to-html lib |
| `status` | `state` | Status → State UUID | Config-based mapping |
| `priority` | `priority` | Enum mapping | "medium" → "medium" |
| `assigneeAgentId` | `assignees` | Agent → Bot User UUID | See Agent Mapping |
| `assigneeUserId` | `assignees` | User → User UUID | Append to array |
| `createdAt` | `created_at` | Direct copy | ISO timestamp |
| `updatedAt` | `updated_at` | Direct copy | ISO timestamp |
| `issueNumber` | (auto-generated) | Skip | Plane generates own IDs |
| `identifier` | (auto-generated) | Skip | Plane generates own IDs |

### Agent Mapping

**Option A: Single Bot User (All Agents)**
```typescript
const AGENT_MAPPING = {
  // All agents map to one bot user
  "*": "550e8400-e29b-41d4-a716-446655440000"
};
```

**Option B: Individual Bot Users (Recommended)**
```typescript
const AGENT_MAPPING = {
  "coder-agent-uuid": "550e8400-e29b-41d4-a716-446655440000",
  "sally-agent-uuid": "660f9500-f990-42e5-b827-557766551111",
  "mike-agent-uuid": "770fa600-05a1-43f6-c938-668877662222",
  "richard-agent-uuid": "880fb700-16b2-54g7-d049-779988773333",
  "nolan-agent-uuid": "990gc800-27c3-65h8-e15a-880099884444",
  "elsa-agent-uuid": "aahd900-38d4-76i9-f26b-991100995555"
};
```

**Setup Process:**
1. Create Plane App for each agent type (or one for all)
2. Register OAuth application in Plane
3. Install app to workspace
4. Extract bot user UUID from installation response
5. Store mapping in Sync Service config

### Status Mapping

| Paperclip Status | Plane State (Example) | State UUID |
|------------------|----------------------|-----------|
| `backlog` | "Backlog" | Config-based |
| `todo` | "Todo" | Config-based |
| `in_progress` | "In Progress" | Config-based |
| `in_review` | "In Review" | Config-based |
| `blocked` | "Blocked" | Config-based |
| `done` | "Done" | Config-based |
| `cancelled` | "Cancelled" | Config-based |

**Note:** State UUIDs are workspace-specific. Configuration should allow custom mappings per workspace.

---

## API Specifications

### Plane API Endpoints Used

**Create Work Item:**
```http
POST /api/v1/workspaces/{workspace_slug}/projects/{project_id}/work-items/
Authorization: Bearer {oauth_token}
Content-Type: application/json

{
  "external_id": "paperclip-issue-uuid",
  "name": "Implement login feature",
  "description_html": "<p>...</p>",
  "state": "state-uuid",
  "priority": "medium",
  "assignees": ["bot-user-uuid"],
  "parent": "epic-uuid"
}
```

**Update Work Item:**
```http
PATCH /api/v1/workspaces/{workspace_slug}/projects/{project_id}/work-items/{work_item_id}/
Authorization: Bearer {oauth_token}
Content-Type: application/json

{
  "state": "new-state-uuid",
  "assignees": ["new-bot-user-uuid"]
}
```

**Get Work Item by External ID:**
```http
GET /api/v1/workspaces/{workspace_slug}/projects/{project_id}/work-items/?external_id={paperclip_issue_id}
Authorization: Bearer {oauth_token}
```

### Webhook Payload

**Plane → Sync Service:**
```http
POST /webhooks/plane
X-Plane-Signature: sha256={hmac_signature}
Content-Type: application/json

{
  "event": "work_item.updated",
  "timestamp": "2026-03-07T03:00:00Z",
  "data": {
    "id": "plane-work-item-uuid",
    "external_id": "paperclip-issue-uuid",
    "name": "Updated title",
    "state": {
      "id": "state-uuid",
      "name": "In Progress"
    },
    "priority": "high",
    "assignees": [
      {
        "id": "bot-user-uuid",
        "display_name": "Coder Agent"
      }
    ]
  }
}
```

### Sync Service Endpoints

**Health Check:**
```http
GET /health
Response: { "status": "ok", "last_sync": "2026-03-07T03:00:00Z" }
```

**Manual Sync Trigger:**
```http
POST /sync/manual
Authorization: Bearer {admin_token}
Response: { "synced": 5, "errors": 0 }
```

**Webhook Handler:**
```http
POST /webhooks/plane
X-Plane-Signature: sha256={hmac_signature}
Response: 200 OK (must respond within 10 seconds)
```

---

## Error Handling

### Error Categories

1. **Network Errors:**
   - Plane API timeout
   - Paperclip DB connection lost
   - Webhook delivery failure

2. **Validation Errors:**
   - Invalid UUID in assignees
   - Non-existent state UUID
   - Missing required fields

3. **Conflict Errors:**
   - Concurrent updates (both systems modified)
   - Race condition in sync

4. **Data Errors:**
   - Missing mapping (status → state)
   - Orphaned references (agent doesn't exist)

### Error Handling Strategy

**Retry Logic:**
- Network errors: Retry 3 times with exponential backoff (1s, 5s, 25s)
- Validation errors: No retry, log error
- Conflict errors: Last-write-wins (based on `updated_at`)
- Data errors: No retry, log error

**Logging:**
- All sync operations logged to Paperclip `issue_comments` table
- Error logs include: issue ID, operation, error message, stack trace
- Success logs include: issue ID, operation, duration, Plane ID

**Alerting:**
- Consecutive failures > 5: Alert via Telegram
- Sync lag > 60 seconds: Alert via Telegram
- Webhook signature validation failure: Alert immediately

---

## Security

### Authentication

**Plane → Sync Service:**
- HMAC-SHA256 webhook signatures
- Verify signature using webhook secret
- Reject requests with invalid/missing signatures

**Sync Service → Plane:**
- OAuth 2.0 bot tokens
- Tokens expire, refresh automatically
- Store tokens encrypted in config

**Sync Service → Paperclip:**
- Direct DB access (same machine)
- Use Paperclip's existing DB credentials
- No additional auth needed

### Authorization

**Plane Bot User Permissions:**
- `projects.work_items:read` - Read work items
- `projects.work_items:write` - Create/update work items
- `projects:read` - Read project metadata

**Sync Service Access Control:**
- Read/write access to Paperclip DB
- No access to agent execution environment
- No access to Plane user data

### Data Privacy

**PII Handling:**
- User IDs synced (UUIDs only)
- No email addresses synced
- No personal data exposed

**Audit Trail:**
- All sync operations logged
- Immutable audit log in Paperclip
- Webhook payloads stored for debugging

---

## Monitoring & Observability

### Metrics

**Sync Performance:**
- `sync_duration_seconds` - Time per sync cycle
- `sync_items_total` - Total items synced
- `sync_errors_total` - Total sync errors
- `sync_lag_seconds` - Time since last successful sync

**Webhook Performance:**
- `webhook_received_total` - Total webhooks received
- `webhook_processing_seconds` - Time to process webhook
- `webhook_errors_total` - Total webhook errors

**API Performance:**
- `plane_api_requests_total` - Total Plane API requests
- `plane_api_errors_total` - Total Plane API errors
- `plane_api_latency_seconds` - API response time

### Dashboards

**Sync Dashboard:**
- Last sync time
- Sync success rate (24h)
- Items pending sync
- Error count (24h)

**Agent Activity Dashboard:**
- Work items by agent
- Agent workload distribution
- Agent completion rate

### Alerts

| Alert | Threshold | Action |
|-------|-----------|--------|
| Sync Down | No sync in 5 min | Telegram notification |
| High Error Rate | > 10% errors in 1 hour | Telegram notification |
| Webhook Failure | 3 consecutive failures | Telegram notification |
| Sync Lag | Lag > 60 seconds | Telegram notification |

---

## Deployment

### Infrastructure Requirements

**Sync Service:**
- Node.js runtime (v20+)
- 512MB RAM minimum
- Persistent storage for config
- Network access to Paperclip DB
- Network access to Plane API
- Public HTTPS endpoint for webhooks

**Dependencies:**
- PostgreSQL client (Paperclip DB)
- Axios (HTTP client)
- Express (webhook server)
- markdown-to-html (description conversion)
- winston (logging)

### Configuration

**Environment Variables:**
```bash
# Paperclip DB
PAPERCLIP_DB_URL=postgresql://user:pass@localhost:5432/paperclip

# Plane OAuth
PLANE_CLIENT_ID=your-client-id
PLANE_CLIENT_SECRET=your-client-secret
PLANE_WORKSPACE_SLUG=my-workspace

# Webhook
WEBHOOK_SECRET=your-webhook-secret
WEBHOOK_PORT=3000

# Sync Settings
SYNC_INTERVAL_MS=5000
MAX_RETRIES=3

# Agent Mapping (JSON)
AGENT_MAPPING='{"coder-uuid": "bot-uuid-1", "sally-uuid": "bot-uuid-2"}'

# Status Mapping (JSON)
STATUS_MAPPING='{"backlog": "state-uuid-1", "todo": "state-uuid-2"}'
```

### Deployment Steps

1. **Create Plane App:**
   ```bash
   # Navigate to Plane workspace settings
   # Create new OAuth application
   # Configure redirect URIs and webhook URL
   # Note client ID and secret
   ```

2. **Deploy Sync Service:**
   ```bash
   # Clone repo
   git clone <sync-service-repo>
   cd sync-service
   
   # Install dependencies
   npm install
   
   # Configure environment
   cp .env.example .env
   # Edit .env with actual values
   
   # Start service
   npm start
   ```

3. **Install Plane App:**
   ```bash
   # Navigate to installation URL
   # Authorize app for workspace
   # Store bot user UUIDs from response
   # Update AGENT_MAPPING in .env
   ```

4. **Verify Setup:**
   ```bash
   # Check health
   curl http://localhost:3000/health
   
   # Trigger manual sync
   curl -X POST http://localhost:3000/sync/manual \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   
   # Create test issue in Paperclip
   # Verify work item appears in Plane
   ```

---

## Testing Strategy

### Unit Tests

**Mapper Functions:**
- Test Paperclip → Plane field mapping
- Test Plane → Paperclip field mapping
- Test status/state mapping
- Test agent/bot user mapping

**API Client:**
- Mock Plane API responses
- Test create/update/get operations
- Test error handling

**Webhook Handler:**
- Mock webhook payloads
- Test signature validation
- Test event processing

### Integration Tests

**End-to-End Sync:**
1. Create issue in Paperclip
2. Verify work item in Plane
3. Update status in Paperclip
4. Verify status update in Plane
5. Add comment in Plane
6. Verify comment in Paperclip

**Webhook Flow:**
1. Assign work item to agent in Plane
2. Verify Paperclip issue updated
3. Verify agent heartbeat triggered

### Performance Tests

**Load Testing:**
- Sync 1000 issues simultaneously
- Measure sync duration
- Verify no data loss

**Webhook Stress Test:**
- Send 100 webhooks in 10 seconds
- Verify all processed correctly
- Measure processing time

---

## Rollout Plan

### Phase 1: Development (Week 1)

**Day 1-2: Setup & Core Sync**
- Create Plane App
- Build Paperclip poller
- Build Plane API client
- Implement basic field mapping

**Day 3-4: Webhook Integration**
- Build webhook handler
- Implement signature validation
- Implement reverse sync (Plane → Paperclip)
- Implement agent triggering

**Day 5: Testing**
- Write unit tests
- Write integration tests
- Manual testing

### Phase 2: Staging (Week 1-2)

**Day 6-7: Advanced Features**
- Comment sync
- Attachment sync
- Conflict resolution
- Error handling

**Day 8: Monitoring**
- Add metrics collection
- Build dashboards
- Configure alerts

**Day 9: Documentation**
- API documentation
- Deployment guide
- Troubleshooting guide

**Day 10: Staging Deployment**
- Deploy to staging environment
- Test with real data
- Stakeholder review

### Phase 3: Production (Week 2)

**Day 11: Production Prep**
- Security review
- Performance testing
- Backup procedures

**Day 12: Production Deployment**
- Deploy to production
- Monitor closely
- Standby for issues

**Day 13-14: Monitoring & Iteration**
- Monitor metrics
- Gather feedback
- Plan v2 improvements

---

## Risks & Mitigations

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Plane API changes | Low | High | Version API, monitor changelog |
| Webhook delivery failures | Medium | Medium | Retry logic, fallback polling |
| Sync conflicts | Medium | Medium | Last-write-wins, manual resolution |
| Performance degradation | Low | Medium | Optimize queries, add caching |
| Security breach | Low | High | HMAC validation, encrypted tokens |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Service downtime | Medium | High | Health checks, auto-restart |
| Config errors | Medium | Medium | Validation, rollback procedure |
| Data corruption | Low | High | Backups, transaction logging |
| Agent mapping errors | Medium | Medium | Validation, dry-run mode |

### Product Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low adoption | Medium | High | Training, documentation |
| User confusion | Medium | Medium | Clear UI labels, tooltips |
| Sync delays | Low | Medium | Optimize polling interval |
| Lost tasks | Low | High | UUID validation, error alerts |

---

## Future Enhancements (v2+)

### Potential Features

1. **Bidirectional Comment Sync:**
   - Currently: Paperclip → Plane only
   - Future: Plane → Paperclip comments

2. **Attachment Sync:**
   - Sync file attachments between systems
   - Handle large files via cloud storage

3. **Bulk Operations:**
   - Bulk assign agents in Plane
   - Bulk status updates
   - Bulk reassignments

4. **Advanced Filtering:**
   - Filter by agent in Plane
   - Filter by project, status, priority
   - Custom views per stakeholder

5. **Reporting:**
   - Agent productivity reports
   - Workload distribution charts
   - Velocity tracking

6. **Mobile Support:**
   - Plane mobile app already exists
   - Ensure sync works with mobile workflows

7. **Multi-Workspace Support:**
   - One sync service for multiple Plane workspaces
   - Workspace isolation

8. **Custom Field Mapping:**
   - Map Paperclip custom fields → Plane custom properties
   - Flexible configuration

---

## Success Criteria

**Launch Criteria:**
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Performance tests passing (< 5s sync latency)
- [ ] Security review complete
- [ ] Documentation complete
- [ ] Stakeholder sign-off

**30-Day Post-Launch:**
- [ ] 99.9% sync reliability
- [ ] < 5 second average sync latency
- [ ] 0 data corruption incidents
- [ ] 80% stakeholder adoption
- [ ] Positive feedback from users

**90-Day Post-Launch:**
- [ ] Feature requests documented
- [ ] Performance baseline established
- [ ] Operational runbooks tested
- [ ] Team trained on troubleshooting

---

## Appendix A: Agent Bot User Setup Guide

### Step-by-Step Process

**1. Create OAuth Application:**

Navigate to Plane workspace settings:
```
https://app.plane.so/{workspace-slug}/settings/integrations
```

Click "Create New App":
- App Name: "Paperclip Agent - Coder"
- App Description: "AI coding agent for backend tasks"
- Setup URL: `https://your-sync-service.com/setup`
- Redirect URI: `https://your-sync-service.com/callback`
- Webhook URL: `https://your-sync-service.com/webhooks/plane`

Note the Client ID and Client Secret.

**2. Install App:**

Navigate to installation URL:
```
https://app.plane.so/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}
```

Authorize the app for your workspace.

You'll receive a callback with:
```json
{
  "app_bot": "550e8400-e29b-41d4-a716-446655440000",
  "workspace_detail": {
    "slug": "my-workspace"
  }
}
```

Store the `app_bot` UUID - this is the bot user ID for this agent.

**3. Repeat for Each Agent:**

Create separate OAuth apps for:
- Coder Agent (backend)
- Sally Agent (frontend/design)
- Mike Agent (QA/testing)
- Richard Agent (docs/research)
- Nolan Agent (DevOps)
- Elsa Agent (marketing)

**4. Update Configuration:**

```bash
# .env
AGENT_MAPPING='{
  "coder-agent-uuid": "550e8400-e29b-41d4-a716-446655440000",
  "sally-agent-uuid": "660f9500-f990-42e5-b827-557766551111",
  ...
}'
```

---

## Appendix B: Status Mapping Configuration

### How to Find State UUIDs

**1. List Project States:**
```bash
curl -X GET \
  "https://api.plane.so/api/v1/workspaces/{workspace_slug}/projects/{project_id}/states/" \
  -H "X-API-Key: $PLANE_API_KEY"
```

**2. Response:**
```json
{
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Backlog",
      "color": "#808080"
    },
    {
      "id": "660f9500-f990-42e5-b827-557766551111",
      "name": "Todo",
      "color": "#FFA500"
    }
  ]
}
```

**3. Update Configuration:**
```bash
# .env
STATUS_MAPPING='{
  "backlog": "550e8400-e29b-41d4-a716-446655440000",
  "todo": "660f9500-f990-42e5-b827-557766551111",
  "in_progress": "770fa600-05a1-43f6-c938-668877662222",
  ...
}'
```

---

## Appendix C: Webhook Signature Validation

### HMAC-SHA256 Validation

**1. Extract Signature Header:**
```typescript
const signature = req.headers['x-plane-signature'];
// "sha256=abc123..."
```

**2. Compute Expected Signature:**
```typescript
import crypto from 'crypto';

const payload = JSON.stringify(req.body);
const expectedSignature = 'sha256=' + 
  crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
```

**3. Compare:**
```typescript
if (signature !== expectedSignature) {
  return res.status(401).send('Invalid signature');
}
```

**Note:** Use constant-time comparison in production to prevent timing attacks.

---

## Appendix D: Conflict Resolution Example

### Scenario: Concurrent Updates

**Timeline:**
1. T+0s: Agent updates issue status to "in_progress" in Paperclip
2. T+1s: Product Manager updates work item priority to "high" in Plane
3. T+2s: Sync Service polls Paperclip, detects status change
4. T+3s: Plane webhook arrives with priority change

**Resolution Strategy: Last-Write-Wins**

```typescript
// Paperclip → Plane sync
const paperclipUpdate = {
  status: "in_progress",
  updatedAt: "2026-03-07T03:00:02Z"
};

// Plane → Paperclip sync
const planeUpdate = {
  priority: "high",
  updatedAt: "2026-03-07T03:00:03Z" // Newer!
};

// Merge: Apply both updates, use newer timestamp for conflict fields
const merged = {
  status: "in_progress", // From Paperclip
  priority: "high",      // From Plane (newer)
  updatedAt: "2026-03-07T03:00:03Z"
};
```

**Result:** Both updates applied, no data loss.

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-07 11:03 HKT  
**Next Review:** After Phase 1 completion
