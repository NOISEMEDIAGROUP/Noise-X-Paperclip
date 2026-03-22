# Integration Awareness & Self-Diagnosis

> **Status**: Design Phase  
> **Priority**: High  
> **Depends On**: UI Simplification Phase 4 (Settings Consolidation)  
> **Estimated Effort**: 12-16 days

## Goal

Enable agents to be "self-aware" about integration requirements:
1. **Self-Diagnose**: Know what integrations they need before/during task execution
2. **Proactively Propose**: When blocked, propose easy setup flows
3. **Guide Setup**: Step-by-step wizard for integration configuration
4. **Resume Flow**: Continue original task after setup completes

---

## User Experience

### Scenario 1: Pre-Task Check (Proactive)

```
User: "Deploy the app to production"
Agent: "I'll need Vercel integration to deploy. Let me check..."
       
       ⚠️ Vercel is not configured.
       
       ┌─────────────────────────────────────────────┐
       │  🔌 Vercel Required                         │
       │                                             │
       │  This task requires Vercel integration.     │
       │  Would you like to set it up now?           │
       │                                             │
       │  [Set up Vercel]  [Skip - I'll do later]   │
       └─────────────────────────────────────────────┘
```

### Scenario 2: During Execution (Reactive)

```
Agent: Running deployment...
       
       ❌ Blocked: Vercel API returned 401 Unauthorized
       
       The agent needs Vercel integration to continue.
       
       ┌─────────────────────────────────────────────┐
       │  🔌 Connect Vercel                          │
       │                                             │
       │  Step 1 of 3: Get your API token           │
       │                                             │
       │  1. Go to Vercel Settings                   │
       │     [Open Vercel →]                         │
       │                                             │
       │  2. Navigate to Tokens → Create New        │
       │                                             │
       │  3. Select scopes:                          │
       │     ☑ Deployments                          │
       │     ☑ Projects (read)                      │
       │                                             │
       │  Paste your token:                          │
       │  [••••••••••••••••••••••••]                │
       │                                             │
       │  [Test Connection]  [Save & Continue]      │
       └─────────────────────────────────────────────┘
       
       ✓ Vercel connected! Resuming deployment...
```

### Scenario 3: Dashboard Insights

```
┌─────────────────────────────────────────────┐
│  ⚠️ Integration Suggestions                 │
│                                             │
│  Your Deployment Agent needs Vercel.        │
│  Your Payments Agent needs Stripe.          │
│                                             │
│  [Set up now →]                             │
└─────────────────────────────────────────────┘
```

---

## Architecture

### Data Model

```sql
-- Integration types (enum)
CREATE TYPE integration_type AS (
  'vercel', 'stripe', 'github', 'linear', 'slack', 
  'telegram', 'resend', 'sentry', 'plausible', 
  'openai', 'anthropic', 'custom'
);

-- Integration requirements (what agents/tools need)
CREATE TABLE integration_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  source_type TEXT NOT NULL, -- 'agent_role', 'tool', 'task_template'
  source_id TEXT NOT NULL, -- agent type name, tool name, template ID
  integration_type TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER DEFAULT 0, -- 0 = critical, 1 = important, 2 = optional
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration setup flows (how to configure)
CREATE TABLE integration_setup_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- lucide icon name
  setup_steps JSONB NOT NULL, -- [{step, title, instructions, action_type, action_url, input_fields}]
  estimated_time TEXT,
  difficulty TEXT DEFAULT 'easy', -- 'easy', 'medium', 'hard'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration health tracking
CREATE TABLE integration_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  integration_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown', -- 'healthy', 'degraded', 'failed', 'unknown'
  last_checked_at TIMESTAMPTZ,
  error_message TEXT,
  capabilities JSONB, -- what this integration can do
  UNIQUE(company_id, integration_type)
);
```

### API Endpoints

```
# Integration Registry
GET    /companies/:id/integrations
       → List all integrations with status and health

POST   /companies/:id/integrations/:type/connect
       → Initiate connection (for OAuth) or save credentials
       → Body: { apiKey?, config?, oauthCode? }

POST   /companies/:id/integrations/:type/verify
       → Test connection and update health status
       → Returns: { success, message, capabilities }

DELETE /companies/:id/integrations/:type
       → Disconnect integration

# Requirements
GET    /companies/:id/integration-requirements
       → Get all required integrations for company
       → Query params: ?agentType=, toolName=
       → Returns: { configured: [], missing: [], optional: [] }

POST   /companies/:id/integration-requirements
       → Add requirement (admin only)
       → Body: { sourceType, sourceId, integrationType, isRequired }

# Catalog
GET    /integrations/catalog
       → List all supported integrations with setup guides

GET    /integrations/catalog/:type
       → Get detailed setup guide for integration type

# Agent-facing
GET    /agents/:id/required-integrations
       → Get integrations required by this agent
       → Used by agent worker before task execution
```

### Agent Runtime Integration

```typescript
// In agent worker - before task execution
async function checkIntegrationRequirements(agent: Agent, task: Task): Promise<{
  canProceed: boolean;
  missingIntegrations: IntegrationRequirement[];
}> {
  const requirements = await getIntegrationsRequiredByAgent(agent.id);
  const companyIntegrations = await getCompanyIntegrations(agent.companyId);
  
  const missing = requirements.filter(req => {
    const integration = companyIntegrations.find(i => i.type === req.integrationType);
    return !integration || integration.status !== 'active';
  });
  
  return {
    canProceed: missing.filter(m => m.isRequired).length === 0,
    missingIntegrations: missing
  };
}

// If missing, create integration request
async function createIntegrationRequest(
  agent: Agent, 
  task: Task, 
  missing: IntegrationRequirement[]
): Promise<void> {
  // Create approval-like request
  await createApproval({
    type: 'integration_required',
    agentId: agent.id,
    taskId: task.id,
    details: {
      missingIntegrations: missing.map(m => ({
        type: m.integrationType,
        priority: m.priority,
        setupUrl: `/integrations/${m.integrationType}/setup`
      }))
    }
  });
  
  // Set task status
  await updateTaskStatus(task.id, 'blocked_integration');
}
```

---

## UI Components

### 1. Integration Proposal Modal

Appears when agent needs integration:

```tsx
interface IntegrationProposalModalProps {
  integrationType: string;
  taskTitle: string;
  priority: 'critical' | 'important' | 'optional';
  onSetup: () => void;
  onSkip: () => void;
}

// Shows:
// - Integration name and icon
// - Why it's needed (task context)
// - Setup time estimate
// - "Setup now" or "Skip" buttons
```

### 2. Integration Setup Wizard

Step-by-step guided setup:

```tsx
interface SetupWizardProps {
  integrationType: string;
  onComplete: () => void;
  onCancel: () => void;
}

// Steps from integration_setup_flows table:
// - Step 1: Go to external service (link opens new tab)
// - Step 2: Create API key (instructions)
// - Step 3: Paste key (input field with test)
// - Success screen with "Resume task"
```

### 3. Integration Health Card (Dashboard)

```tsx
// Shows in dashboard when integrations missing:
// - Count of missing integrations
// - Which agents are affected
// - Quick link to setup
```

### 4. Integration Status Section (Agent Detail)

Shows in agent detail page:

```tsx
// Requirements section:
// - ✓ Vercel - Configured
// - ⚠ Stripe - Missing (required for payments)
// - ○ Slack - Optional (for notifications)
```

---

## Implementation Phases

### Phase A: Integration Registry (2-3 days)

**Goal**: Foundation for tracking integrations

- [ ] Create `integration_requirements` table
- [ ] Create `integration_health` table  
- [ ] Create `integration_setup_flows` table (seed with existing integrations)
- [ ] API endpoints for integration management
- [ ] Extend existing Integration Status page with "Connect" buttons

**Files to modify**:
- `packages/db/src/schema/` - new tables
- `server/src/routes/integrations.ts` - new routes
- `ui/src/api/integrations.ts` - API client
- `ui/src/pages/settings/Config.tsx` - add connect buttons

### Phase B: Setup Wizard (3-4 days)

**Goal**: Guided integration setup

- [ ] Create `SetupWizard` component
- [ ] Seed `integration_setup_flows` with setup instructions for each integration
- [ ] Add test connection functionality
- [ ] OAuth flow support (for Vercel, GitHub, Linear, etc.)
- [ ] Success/completion screen with resume action

**Files to create**:
- `ui/src/components/IntegrationSetupWizard.tsx`
- `ui/src/components/IntegrationProposalModal.tsx`
- `server/src/services/integrationHealth.ts`

### Phase C: Agent Awareness (3-4 days)

**Goal**: Agents know and report requirements

- [ ] Add `requiredIntegrations` field to agent config
- [ ] Pre-task integration check in agent worker
- [ ] `blocked_integration` task status
- [ ] Integration request creation (approval-like)
- [ ] Resume flow after integration setup

**Files to modify**:
- `packages/db/src/schema/agents.ts` - add requirements field
- `server/src/services/agents.ts` - requirements management
- `server/src/workers/` - integration check logic
- `ui/src/pages/AgentDetail.tsx` - show requirements

### Phase D: Dashboard Integration (2 days)

**Goal**: Proactive suggestions

- [ ] Dashboard "Integration Suggestions" card
- [ ] Quick setup links from dashboard
- [ ] Health monitoring background job
- [ ] Notification when integration fails

**Files to modify**:
- `ui/src/pages/Dashboard.tsx` - add suggestions card
- `server/src/services/integrationHealth.ts` - monitoring job

### Phase E: Self-Learning (2-3 days)

**Goal**: Learn from failures

- [ ] Log integration failures to `integration_requirements`
- [ ] Admin UI to approve "remember this requirement"
- [ ] Suggest requirements based on task type patterns
- [ ] Integration capability detection

---

## Integration Catalog

Initial integrations to support:

| Integration | Priority | Setup Difficulty | Auth Method |
|-------------|----------|------------------|-------------|
| Vercel | Critical | Easy | API Key / OAuth |
| Stripe | Critical | Medium | API Key |
| GitHub | Important | Easy | OAuth / PAT |
| Linear | Important | Easy | API Key |
| Slack | Optional | Medium | OAuth |
| Telegram | Optional | Easy | Bot Token |
| Resend | Optional | Easy | API Key |
| Sentry | Optional | Easy | DSN |
| OpenAI | Critical | Easy | API Key |
| Anthropic | Important | Easy | API Key |

---

## Design Decisions

### Why Integration Requirements Table vs. Agent Config?

**Decision**: Use separate `integration_requirements` table

**Rationale**:
- Requirements can come from multiple sources: agent role, specific tools, task templates
- Easier to query "what integrations are missing across all agents"
- Supports adding requirements dynamically without changing agent config
- Clear separation: agent config = behavior, requirements = dependencies

### OAuth vs API Key

**Decision**: Support both, prefer OAuth when available

**Rationale**:
- OAuth provides better security (scoped access, revocable)
- API keys are simpler for users who prefer that approach
- Some services don't support OAuth
- Let user choose during setup

### Blocking vs. Warning

**Decision**: Block only on critical integrations, warn on optional

**Rationale**:
- User may want to proceed without all integrations
- Agent can still do partial work
- Clear visual distinction: 🔴 Blocked, 🟡 Warning, 🟢 Ready

---

## Success Criteria

1. **Proactive Detection**: Agent knows before task that integration is missing
2. **Easy Setup**: Setup wizard completes in < 3 minutes
3. **Clear Communication**: User understands why integration is needed
4. **Seamless Resume**: Task continues automatically after setup
5. **Self-Healing**: Integration health monitoring detects and reports issues

---

## Questions to Resolve

1. **Scope**: Should this apply to all agents or start with specific agent types?
2. **Permissions**: Who can add/remove integration requirements? Admin only?
3. **Secrets**: How to handle integration secrets that are shared across agents?
4. **Audit**: Should we log every integration check/requirement addition?
5. **Testing**: How to test integration setup flows without real credentials?