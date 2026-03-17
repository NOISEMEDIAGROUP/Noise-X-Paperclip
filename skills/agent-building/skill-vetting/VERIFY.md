# Verify: Skill Vetting

## File Check
- [ ] `~/.claude/skills/skill-vetting/SKILL.md` exists
- [ ] `~/.claude/skills/skill-vetting/references/hook-audit.md` exists
- [ ] `~/.claude/skills/skill-vetting/references/permission-scope.md` exists
- [ ] `~/.claude/skills/skill-vetting/references/threat-model.md` exists
- [ ] `~/.claude/skills/skill-vetting/references/trigger-analysis.md` exists
- [ ] `~/.claude/skills/skill-vetting/references/trust-tiers.md` exists
- [ ] `~/.claude/skills/skill-vetting/references/vetting-workflow.md` exists

## Trigger Tests
Try these prompts — the skill should fire:
- [ ] "Audit this skill for hook injection risks" → skill activates
- [ ] "Review the security of this skill I found on GitHub" → skill activates
- [ ] "Can you check this skill's permission footprint?" → skill activates
- [ ] "I want to vet the skill-creator skill before adding it to my config" → skill activates
- [ ] "Compare these two versions of a skill and flag security regressions" → skill activates
- [ ] "Set up a trust policy for my skill sources" → skill activates
- [ ] "Run a security audit on this SKILL.md" → skill activates
- [ ] "This skill requests bash permissions — is that justified?" → skill activates
- [ ] "Should I trust this skill from a random GitHub repo?" → skill activates
- [ ] "Check for hook injection in this skill" → skill activates

## No-Fire Tests
Try these prompts — the skill should NOT fire:
- [ ] (No no-fire tests found in test-cases.md)

## Quick Smoke Test
1. Open Claude Code
2. Type: "Audit this skill for hook injection risks"
3. Verify the skill activates and provides relevant guidance
4. Confirm output references the correct primitives for the goal

## Troubleshooting
- **Skill doesn't trigger:** Check that SKILL.md is at `~/.claude/skills/skill-vetting/SKILL.md`. Restart Claude Code.
- **Partial functionality:** Verify all reference files copied. Check for missing MCP servers.
- **Unexpected behavior:** Check `~/.claude/skill-customizations/skill-vetting/` for overrides.
