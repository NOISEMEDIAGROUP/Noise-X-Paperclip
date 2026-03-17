# Workflow Routing Tables

A routing table maps request patterns to specific workflows. It makes agent behavior explicit, auditable, and self-documenting.

## Why Routing Tables Beat Prose

**Prose:**
> "You should handle research requests by searching multiple sources and synthesizing the results into a brief."

**Routing table:**
| When the request... | Route to |
|---|---|
| "research [topic]", "find demand for", "what's popular in" | BriefWritingWorkflow |
| "deep investigation", "map the landscape" | DeepInvestigationWorkflow |
| Default | BriefWritingWorkflow |

The routing table is an explicit contract. Prose is ambiguous — the agent guesses.

## 5 Trigger Types

### Type 1: Task-Type Triggers
Route based on what kind of work the request is.

| When the request asks to... | Route to |
|---|---|
| Research, investigate, find data | ResearchWorkflow |
| Build, implement, create | BuildWorkflow |
| Review, check, QC, validate | ReviewWorkflow |
| Fix, debug, repair | DebugWorkflow |
| Plan, design, architect | PlanWorkflow |

### Type 2: Keyword Triggers
Route based on specific terms in the request.

| When the request includes... | Route to |
|---|---|
| "brief", "research brief", "skill brief" | BriefWritingWorkflow |
| "QC", "quality check", "pass/fail" | QCWorkflow |
| "optimize", "improve", "simplify" | OptimizationWorkflow |
| "SKILL.md", "create a skill" | SkillBuildingWorkflow |

### Type 3: Status-State Triggers
Route based on the current state of the system.

| When the system is... | Route to |
|---|---|
| Pipeline idle (0 active issues) | SelfStartWorkflow |
| Blocked issue assigned to me | UnblockWorkflow |
| Approval pending | ApprovalResolutionWorkflow |

### Type 4: Context Triggers
Route based on where the request comes from.

| When the request comes from... | Route to |
|---|---|
| CEO agent | PriorityWorkflow |
| Another agent's handoff | HandoffWorkflow |
| User directly | DirectWorkflow |

### Type 5: Default Route
Every routing table needs a catch-all. Without it, the agent invents a workflow.

| Everything else | DefaultWorkflow |
|---|---|

## Writing Reliable Trigger Patterns

**Too broad (fires on everything):**
- "any request about the project"
- "when someone asks a question"

**Too narrow (misses real cases):**
- "when the user says exactly 'please research this'"
- "when the title contains the word 'research'"

**Reliable (specific but flexible):**
- Phrase clusters: "mentions 'research', 'investigate', 'find data about', 'demand signal'"
- Action verbs + object: "asks for a 'brief', 'report', 'analysis'"
- Status-based: "pipeline idle (0 active issues)"

## Routing Table vs. Inline Instructions

Use a routing table when:
- The agent has 3+ distinct workflow types
- Each workflow has meaningfully different steps
- You want the agent to self-document its scope

Use inline instructions when:
- The agent does exactly one thing
- The workflow is short enough to fit in 10 lines

## Worked Example: Research Agent

```markdown
## Workflow Routing

| When the request... | Route to |
|---|---|
| "deep investigation", "map the landscape", "comprehensive research on" | `Workflows/DeepInvestigation.md` |
| "find demand for", "research [topic]", "what's the market for" | Inline brief workflow (below) |
| Pipeline idle (0 active issues) | Inline self-start workflow (below) |
| Default | Inline brief workflow |
```

**Why this works:**
- Deep investigation is different enough to have its own file
- Standard research is inline because it's the main workflow
- Self-start is inline because it's a short bootstrap
- Default prevents hallucinated workflows
