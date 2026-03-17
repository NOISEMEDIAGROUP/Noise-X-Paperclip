# Tool Access Design

## The Principle of Least Privilege

Give each agent exactly the tools it needs to do its job — nothing more. Not because agents are malicious, but because:

1. Unexpected tool access leads to unexpected behavior
2. Overprivileged agents cause side effects that are hard to debug
3. Explicit access makes behavior auditable and predictable

**Start with nothing. Add only what the role explicitly requires.**

## Tool Access by Agent Role

### Researcher

**Authorized:**
- Read, Glob, Grep — to understand project context
- WebSearch, browse — primary job requirement
- `gh` CLI (read-only) — to read GitHub issues and discussions
- Write — for saving briefs and notes only (scoped to `briefs/` directory)

**Not authorized:**
- Bash execution — no reason to run commands
- Edit/MultiEdit — not its mandate to modify code
- Git operations — not its mandate to commit

### Builder

**Authorized:**
- All file operations (Read, Write, Edit, Glob, Grep, MultiEdit)
- Bash — for running tests, builds, scripts
- Git — for committing work (co-authored)
- `gh` CLI — for PR creation and branch management

**Not authorized:**
- Production deploy commands — deployment is a separate step with human approval
- Production database access — use staging only
- Secrets/credentials management — inject via env vars, never hardcode

### Reviewer

**Authorized:**
- Read, Glob, Grep — needs full codebase read access
- `gh` CLI (read-only) — for reading PRs and diffs
- Write to one specific file — for appending to `learnings/[slug].md` only

**Not authorized:**
- Edit/Write files — reviewer reads, doesn't change
- Bash execution — no reason to run builds
- Git operations — not its mandate to commit

### Orchestrator

**Authorized:**
- All of the above — orchestrators coordinate other agents
- Agent spawn (Agent tool) — to delegate to sub-agents
- API access — for status checks and issue management

**Not authorized:**
- Direct code implementation — delegates to Builder
- Direct content writing — delegates to Writer
- Direct research — delegates to Researcher

## Permission Anti-Patterns

| Anti-Pattern | Problem |
|---|---|
| Give all tools "just in case" | Agent uses tools for unintended purposes |
| Give no tools to avoid risk | Agent can't do its job, blocks work |
| Copy-paste tool access from another agent | Access mismatch — roles differ |
| Never audit tool access | Creep: roles change, access doesn't |
| Vague access declarations | "can use file tools" is not an access policy |

## Tool Access Declaration Format

```markdown
## Tool Access

**Authorized:**
- Read, Glob, Grep — file reading
- WebSearch, browse — web research
- Write — save briefs to `skills/briefs/` only
- `gh` CLI — read GitHub issues (read-only)

**Not authorized:**
- Edit, MultiEdit — not my role
- Bash — no commands needed
- Git operations — not my role
```

## Auditing Tool Access

Review tool access when:
- The agent's role changes
- You notice the agent doing work outside its mandate
- A new tool becomes available that would help
- An incident traces back to unexpected tool use

The question isn't "could this tool be useful?" — it's "does this role require this tool?"
