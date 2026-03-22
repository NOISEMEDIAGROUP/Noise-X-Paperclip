# Phase 6: Integration Awareness & Agent Recommendations

> **Status**: Complete ✅  
> **Priority**: High  
> **Depends On**: UI Simplification Phase 4-5 (Complete ✅)  
> **Completed**: 2026-03-22

## Goal

Enable agents to:
1. **Self-Diagnose**: Detect when integrations are missing or failing
2. **Notify Clearly**: Tell the user exactly what's needed in simple terms
3. **Recommend Smartly**: After research, suggest the best (free-first) integrations
4. **Guide Setup**: One-click setup with clear instructions

---

## Core Principle: Clear Communication

**The agent should tell the user:**
- What integration is needed (simple name)
- Why it's needed (one sentence)
- How long setup takes (estimated time)
- Whether it's free or paid (upfront)

---

## User Experience Design

### 1. Task-Level Notification (Primary)

When an agent is blocked by a missing integration:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔌 Integration Required                                        │
│                                                                 │
│  CEO needs Telegram to send you daily briefs.                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📱 Telegram                                    FREE    │   │
│  │                                                         │   │
│  │  • Send daily briefs                                    │   │
│  │  • Get instant alerts                                   │   │
│  │  • Setup time: ~3 minutes                               │   │
│  │                                                         │   │
│  │  [Connect Telegram]  [Skip for now]                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  💡 You can also set this up later in Settings → Integrations   │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Agent Recommendation Panel (After Research)

When an agent researches and finds the best tools:

```
┌─────────────────────────────────────────────────────────────────┐
│  💡 Recommended by PM Agent                                      │
│                                                                 │
│  Based on my research, here are the best options for           │
│  "project management":                                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ⭐ GitHub Projects                             FREE    │   │
│  │     Best for: Code-linked projects                       │   │
│  │     Already connected ✓                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Linear                                         FREE    │   │
│  │     Best for: Fast-moving teams                          │   │
│  │     Free tier: 10 users                                  │   │
│  │                                                         │   │
│  │     [Connect Linear]                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Jira                                          PAID     │   │
│  │     Best for: Enterprise teams                           │   │
│  │     Starting at $7.75/user/month                         │   │
│  │                                                         │   │
│  │     [Learn more]  [Not interested]                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Dismiss]  [Save to Settings]                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Settings → Integrations: Recommendations Section

A new section showing agent-suggested integrations:

```
┌─────────────────────────────────────────────────────────────────┐
│  Integrations                                                   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  💡 Agent Recommendations (3)                       [See all]│ │
│  │                                                           │ │
│  │  PM suggests: Linear (project management)        [Setup]  │ │
│  │  CEO suggests: Telegram (daily briefs)    Connected ✓    │ │
│  │  CTO suggests: Sentry (error tracking)           [Setup]  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Business Integrations                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Stripe              not configured               [Connect] │ │
│  │  Telegram            ✓ Connected                   [Manage] │ │
│  │  ...                                                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture

### Data Model

```sql
-- Integration recommendations from agents
CREATE TABLE integration_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  
  -- Who recommended this
  agent_id UUID REFERENCES agents(id),
  agent_role TEXT, -- 'ceo', 'pm', 'cto', etc.
  
  -- What integration
  integration_id TEXT NOT NULL, -- 'telegram', 'linear', 'stripe', etc.
  integration_name TEXT NOT NULL,
  
  -- Why recommended
  reason TEXT NOT NULL, -- "for daily briefs", "for error tracking"
  use_case TEXT, -- "daily_briefs", "error_tracking", "payments"
  
  -- Priority and status
  priority INTEGER DEFAULT 0, -- 0 = high priority
  is_free BOOLEAN DEFAULT true,
  pricing_notes TEXT, -- "Free tier: 10 users", "$7.75/user/month"
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'dismissed', 'connected'
  connected_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, integration_id, agent_id)
);

-- Integration blocking events (when agent is blocked)
CREATE TABLE integration_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  
  -- What was blocked
  agent_id UUID REFERENCES agents(id),
  task_id UUID REFERENCES issues(id),
  
  -- What integration was needed
  integration_id TEXT NOT NULL,
  integration_name TEXT NOT NULL,
  
  -- Message to user
  message TEXT NOT NULL, -- "CEO needs Telegram to send daily briefs"
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT, -- 'user_setup', 'user_skip', 'agent_alternative'
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration catalog with pricing info
CREATE TABLE integration_catalog (
  id TEXT PRIMARY KEY, -- 'telegram', 'stripe', etc.
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- lucide icon name
  category TEXT NOT NULL, -- 'notifications', 'payments', 'monitoring', etc.
  
  -- Pricing
  is_free BOOLEAN DEFAULT false,
  free_tier_limit TEXT, -- "10 users", "1000 emails/month"
  paid_price TEXT, -- "$7.75/user/month"
  paid_url TEXT, -- pricing page URL
  
  -- Setup
  setup_time_minutes INTEGER DEFAULT 5,
  setup_difficulty TEXT DEFAULT 'easy', -- 'easy', 'medium', 'hard'
  
  -- Capabilities
  capabilities JSONB, -- ["send_messages", "daily_briefs", "alerts"]
  
  -- Related agents (which agents typically use this)
  used_by_agents TEXT[], -- ['ceo', 'pm', 'support_lead']
);
```

### API Endpoints

```typescript
// Get integration blocks for current user
GET /api/companies/:id/integration-blocks
→ { blocks: IntegrationBlock[] }

// Dismiss a block
POST /api/companies/:id/integration-blocks/:blockId/dismiss
→ { success: true }

// Get recommendations
GET /api/companies/:id/integration-recommendations
→ { 
  pending: IntegrationRecommendation[],
  connected: IntegrationRecommendation[],
  dismissed: IntegrationRecommendation[]
}

// Dismiss a recommendation
POST /api/companies/:id/integration-recommendations/:recId/dismiss
→ { success: true }

// Agent creates a recommendation
POST /api/companies/:id/integration-recommendations
→ Body: { integrationId, reason, useCase, isFree, pricingNotes }
→ { recommendation: IntegrationRecommendation }

// Get integration catalog
GET /api/integrations/catalog
→ { integrations: IntegrationCatalog[] }

// Get free integrations only
GET /api/integrations/catalog?free=true
→ { integrations: IntegrationCatalog[] }
```

### Agent Integration Check

```typescript
// In agent worker - before task execution
async function checkIntegrationRequirements(
  agent: Agent,
  task: Task
): Promise<IntegrationCheckResult> {
  // 1. Get required integrations for this agent role
  const required = await getRequiredIntegrations(agent.role);
  
  // 2. Get connected integrations
  const connected = await getConnectedIntegrations(agent.companyId);
  
  // 3. Find missing
  const missing = required.filter(r => 
    !connected.some(c => c.id === r.id && c.status === 'active')
  );
  
  if (missing.length > 0) {
    // Create block event
    await createIntegrationBlock({
      companyId: agent.companyId,
      agentId: agent.id,
      taskId: task.id,
      integrationId: missing[0].id,
      message: `${agent.name} needs ${missing[0].name} to ${missing[0].primaryUseCase}`
    });
    
    return {
      canProceed: false,
      reason: 'missing_integration',
      missingIntegration: missing[0],
      blockId: block.id
    };
  }
  
  return { canProceed: true };
}
```

### Agent Recommendation Flow

```typescript
// When agent researches and finds best tools
async function agentRecommendIntegration(
  agent: Agent,
  task: Task,
  research: ResearchResult
): Promise<void> {
  // 1. Parse research for integration suggestions
  const suggestions = parseIntegrationSuggestions(research);
  
  // 2. Sort by free-first, then relevance
  const sorted = suggestions.sort((a, b) => {
    // Free first
    if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
    // Then by relevance score
    return b.relevance - a.relevance;
  });
  
  // 3. Create recommendations
  for (const suggestion of sorted.slice(0, 3)) { // Top 3
    await createIntegrationRecommendation({
      companyId: agent.companyId,
      agentId: agent.id,
      agentRole: agent.role,
      integrationId: suggestion.id,
      integrationName: suggestion.name,
      reason: suggestion.reason,
      useCase: suggestion.useCase,
      isFree: suggestion.isFree,
      pricingNotes: suggestion.pricingNotes,
      priority: suggestion.isFree ? 0 : 1
    });
  }
  
  // 4. Notify user
  await notifyUser({
    type: 'integration_recommendation',
    title: `${agent.name} found ${sorted.length} tools for ${task.title}`,
    body: sorted[0].isFree 
      ? `${sorted[0].name} (FREE) - ${sorted[0].reason}`
      : `${sorted[0].name} - ${sorted[0].reason}`,
    actionUrl: '/settings/integrations'
  });
}
```

---

## UI Components

### 1. IntegrationBlockModal.tsx

```tsx
interface IntegrationBlockModalProps {
  block: IntegrationBlock;
  onSetup: () => void;
  onSkip: () => void;
}

// Shows:
// - Clear title: "{Agent} needs {Integration}"
// - Simple reason: "to send daily briefs"
// - Integration card with FREE/PAID badge
// - Setup time estimate
// - Two buttons: [Connect] [Skip for now]
// - Footer: "You can also set this up in Settings"
```

### 2. AgentRecommendationCard.tsx

```tsx
interface AgentRecommendationCardProps {
  recommendation: IntegrationRecommendation;
  onSetup: () => void;
  onDismiss: () => void;
}

// Shows:
// - Agent avatar + name
// - Integration name + icon
// - FREE/PAID badge (prominent)
// - Reason (one line)
// - Free tier info if applicable
// - Button: [Connect] or [Learn more] if paid
```

### 3. RecommendationsSection.tsx

```tsx
// Goes in Settings → Integrations tab
// Shows pending recommendations from agents
// Grouped by: FREE first, then PAID
// Each has quick [Setup] button
```

### 4. IntegrationBlockBanner.tsx

```tsx
// Shows on Dashboard when there are blocks
// "2 agents are waiting for integrations"
// [View details →]
```

---

## Integration Catalog (with Free Tier Info)

| Integration | Category | Free? | Free Tier | Paid From |
|-------------|----------|-------|-----------|-----------|
| **Telegram** | Notifications | ✅ FREE | Unlimited | - |
| **Slack** | Notifications | ✅ FREE | 10k messages | $7.25/user/mo |
| **GitHub** | Development | ✅ FREE | Unlimited public | $4/user/mo |
| **Sentry** | Monitoring | ✅ FREE | 5k errors/mo | $26/mo |
| **Uptime Kuma** | Monitoring | ✅ FREE | Self-hosted | - |
| **Plausible** | Analytics | ✅ FREE | Self-hosted | $9/mo |
| **Resend** | Notifications | ✅ FREE | 3k emails/mo | $20/mo |
| **Stripe** | Payments | ⚠️ Usage | 2.9% + 30¢/tx | - |
| **Linear** | Project Mgmt | ✅ FREE | 10 users | $8/user/mo |

---

## Implementation Phases

### Phase 6A: Core Infrastructure (3 days) ✅

**Goal**: Foundation for tracking blocks and recommendations

**Tasks**:
- [x] Create `integration_recommendations` table + migration
- [x] Create `integration_blocks` table + migration
- [x] Create `integration_catalog` table + seed data
- [x] API endpoints for blocks and recommendations
- [x] Agent integration check function

**Files**:
- `packages/db/src/schema/integrationRecommendations.ts`
- `server/src/routes/integrationRecommendations.ts`
- `server/src/services/integrationCheck.ts`

### Phase 6B: Notification UX (3 days) ✅

**Goal**: Clear, simple notifications for missing integrations

**Tasks**:
- [x] Create `IntegrationBlockModal` component
- [x] Create `IntegrationBlockBanner` for Dashboard
- [x] WebSocket event for real-time block notification
- [x] Test: Agent → Block → Modal → Setup flow

**Files**:
- `ui/src/components/IntegrationBlockModal.tsx`
- `ui/src/components/IntegrationBlockBanner.tsx`
- `ui/src/pages/Dashboard.tsx` (add banner)
- `server/src/services/realtimeEvents.ts`

### Phase 6C: Recommendations UI (2 days) ✅

**Goal**: Display agent recommendations in Settings

**Tasks**:
- [x] Create `RecommendationsSection` component
- [x] Create `AgentRecommendationCard` component
- [x] Add to Integrations Tab
- [x] Dismiss and setup actions

**Files**:
- `ui/src/components/settings/RecommendationsSection.tsx`
- `ui/src/components/AgentRecommendationCard.tsx`
- `ui/src/pages/settings/Config.tsx`

### Phase 6D: Agent Integration (2 days) ✅

**Goal**: Agents can create recommendations

**Tasks**:
- [x] Add `recommend_integration` tool to agent skills
- [x] Add free-tier prioritization logic
- [x] Add notification when agent recommends
- [x] Test: Agent research → Recommend → User sees in Settings

**Files**:
- `skills/paperclip/SKILL.md` (add tool)
- `server/src/routes/integrationRecommendations.ts` (agent access + live events)
- `ui/src/hooks/useIntegrationBlockEvents.ts` (recommendation events)

---

## Success Criteria

1. **Clear Notification**: User understands exactly what integration is needed and why
2. **Free First**: Free integrations always shown before paid
3. **One-Click Setup**: User can connect in < 3 clicks from notification
4. **Agent Awareness**: Agents know their required integrations
5. **Research-Driven**: Agents can recommend after research

---

## Example Scenarios

### Scenario 1: CEO Needs Telegram

```
1. User creates task: "Send me a daily brief at 9am"
2. CEO agent checks: Telegram connected? NO
3. CEO creates block: "CEO needs Telegram to send daily briefs"
4. User sees modal: "Connect Telegram (FREE) - ~3 min setup"
5. User clicks [Connect Telegram]
6. Setup wizard opens
7. After setup: CEO resumes task automatically
```

### Scenario 2: CTO Researches Monitoring

```
1. Task: "Set up error tracking for the app"
2. CTO researches options
3. CTO finds: Sentry (FREE 5k errors), Rollbar (PAID), Bugsnag (PAID)
4. CTO creates recommendations (Sentry first because FREE)
5. User sees: "CTO found 3 tools for error tracking"
6. Sentry card shows: "FREE - 5,000 errors/month"
7. User clicks [Connect Sentry]
```

### Scenario 3: PM Suggests Linear

```
1. PM is analyzing project workflow
2. PM notices: GitHub Projects limited for task management
3. PM recommends: Linear (FREE for 10 users)
4. Recommendation appears in Settings → Integrations
5. User reviews later and decides to connect
```

---

## Design Decisions

### Why Free-First?

**Decision**: Always show free integrations before paid, prioritize open-source

**Rationale**:
- Users prefer free options
- Open-source solutions are more trustworthy
- Reduces friction to adoption
- Builds trust with user
- Still shows paid options for those who need them

### Why Agent Recommendations?

**Decision**: Let agents suggest integrations after research

**Rationale**:
- Agents have context about what's needed
- Agents can research best options
- Personalized to user's actual workflow
- Reduces user decision fatigue

### Why Both Modal + Banner?

**Decision**: Use both notification styles

**Rationale**:
- Modal for critical/required integrations - ensures user sees it
- Banner for optional/recommended integrations - less intrusive
- User can choose to act or dismiss
- Clear visual hierarchy

### Why Continue Without Integration?

**Decision**: Agent continues and recommends next best step

**Rationale**:
- User may not want to set up integration now
- Agent can still provide value
- Recommendation stays in Settings for later
- No blocking of entire workflow

### Why Top 3 Recommendations?

**Decision**: Show top 3 recommendations

**Rationale**:
- Prevents decision fatigue
- Enough options to compare
- Prioritized by: open-source > free tier > paid
- User can see more in Settings if needed

---

## User Preferences (Confirmed)

| Preference | Decision |
|------------|----------|
| Notification Style | Both modal + banner |
| Skip Behavior | Agent continues, recommends next best step |
| Recommendation Limit | Top 3 |
| Priority Order | Open-source > Free tier > Paid |
| Setup Flow | Clear, simple, 3-click maximum |

---

## Next Steps

1. Review this design with user
2. Prioritize which phase to implement first
3. Create detailed implementation tickets
4. Start with Phase 6A (Core Infrastructure)