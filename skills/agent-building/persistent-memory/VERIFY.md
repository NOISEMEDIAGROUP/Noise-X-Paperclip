# Verify: Persistent Memory

## File Check
- [ ] `~/.claude/skills/persistent-memory/SKILL.md` exists
- [ ] `~/.claude/skills/persistent-memory/references/anti-patterns.md` exists
- [ ] `~/.claude/skills/persistent-memory/references/hooks.md` exists
- [ ] `~/.claude/skills/persistent-memory/references/memory-types.md` exists
- [ ] `~/.claude/skills/persistent-memory/references/walkthrough.md` exists

## Trigger Tests
Try these prompts — the skill should fire:
- [ ] "My claude code agent keeps forgetting things between sessions" → skill activates
- [ ] "How do I set up persistent memory in claude code?" → skill activates
- [ ] "What is MEMORY.md and how does it work?" → skill activates
- [ ] "I want to save session learnings across context compaction" → skill activates
- [ ] "How do I write a SessionStart hook to load memory?" → skill activates
- [ ] "Agent memory gets wiped after context compaction" → skill activates
- [ ] "How do I capture decisions across sessions?" → skill activates
- [ ] "cross-session memory claude code" → skill activates
- [ ] "How do I make claude code remember things?" → skill activates
- [ ] "Stop hook for saving session memory" → skill activates

## No-Fire Tests
Try these prompts — the skill should NOT fire:
- [ ] (No no-fire tests found in test-cases.md)

## Quick Smoke Test
1. Open Claude Code
2. Type: "My claude code agent keeps forgetting things between sessions"
3. Verify the skill activates and provides relevant guidance
4. Confirm output references the correct primitives for the goal

## Troubleshooting
- **Skill doesn't trigger:** Check that SKILL.md is at `~/.claude/skills/persistent-memory/SKILL.md`. Restart Claude Code.
- **Partial functionality:** Verify all reference files copied. Check for missing MCP servers.
- **Unexpected behavior:** Check `~/.claude/skill-customizations/persistent-memory/` for overrides.
