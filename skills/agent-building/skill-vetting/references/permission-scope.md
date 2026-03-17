# Permission Scope Review

## What Permissions Do

Permissions in `settings.json` control what Claude Code can execute without prompting you. Skills can request specific permissions that get added to your config. Once granted, they apply to every session — not just when that skill is running.

This means a skill's permission footprint is permanent until you manually remove it.

## Minimum Viable Permission Sets

The principle: a skill should request only what its stated purpose requires. Anything beyond that is a red flag.

| Skill Type | Justified Permissions | Red Flags |
|---|---|---|
| Read-only analysis (code review, audit, summarize) | None — Read is always allowed | Any bash permission |
| File generation (writing docs, creating configs) | `write: specific/path` | Broad `write: *` |
| Git workflow | `bash: git`, `bash: gh` | `bash: *` |
| Build/test runner | `bash: bun`, `bash: npm`, `bash: cargo` | `bash: *` |
| MCP server manager | `mcp:` specific servers | `mcp: *` |
| Browser automation | `mcp: chrome-cdp` | Bash access alongside browser |
| Shell/terminal skill | `bash: *` with justification | Combined with file write + no justification |

## Evaluating "Is This Permission Justified?"

For each requested permission, answer:
1. **What does the skill say it does?** (from SKILL.md description and body)
2. **What is the minimum permission needed to do that?**
3. **Does the request match the minimum, or does it exceed it?**

### Examples

```
Skill: "Summarize this GitHub issue"
Requested: bash:*
Finding: CRITICAL — no bash needed to read a URL and summarize. Broad bash request unjustified.
```

```
Skill: "Run your test suite and fix failures"
Requested: bash: bun test, bash: bun run
Finding: PASS — specific commands match stated purpose
```

```
Skill: "Manage your AGENTS.md files"
Requested: write: agents/*, read: agents/*
Finding: PASS — scoped to agents directory, matches purpose
```

## Permission Creep Patterns

### Scope Creep by Accident
An author adds `bash:*` during development for convenience and never scopes it down before publishing.

**Detection:** Check if the specific commands used in the skill body can be enumerated. If they can, they should be listed explicitly.

### Layered Permissions
A skill requests write access + bash access + MCP server access. Each individually looks reasonable, but combined they form a very broad footprint.

**Rule:** Add up all permissions. Ask: "Could these combined permissions be used maliciously?" If yes, justify each one explicitly.

### Permissions Beyond the SKILL.md Scope
The skill description says "helps with writing" but requests permissions for database access, external API calls, or system commands. The mismatch is the finding.

## Severity Guide

| Finding | Severity |
|---|---|
| `bash:*` for a read-only analysis skill | Critical |
| `bash:*` for any skill without specific justification in README | High |
| Permissions broader than the minimum (e.g., `write: *` when `write: docs/` would do) | High |
| MCP permissions beyond stated scope | Medium |
| Multiple permission categories combined without explanation | Medium |
| Single specific permission, but scope slightly broader than needed | Low |
