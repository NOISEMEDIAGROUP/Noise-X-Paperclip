# Install: Skill Vetting

## Phase 1: Prerequisites Check
- [ ] Claude Code installed and running

## Phase 2: Configuration
Set up the following hooks in `~/.claude/settings.json`:
```json
{
  "hooks": {
    "PreToolUse": [{ "hooks": [{ "type": "command", "command": "/abs/path/to/hook.sh" }] }]
    "PostToolUse": [{ "hooks": [{ "type": "command", "command": "/abs/path/to/hook.sh" }] }]
    "Stop": [{ "hooks": [{ "type": "command", "command": "/abs/path/to/hook.sh" }] }]
  }
}
```

**Critical:** Use absolute paths in hook commands. Relative paths silently fail.

Choose your preferred defaults:
- Create `~/.claude/skill-customizations/skill-vetting/PREFERENCES.md` with your choices (see Phase 4)

## Phase 3: Installation
Copy skill files to your Claude Code skills directory:

```bash
# Create skill directory
mkdir -p ~/.claude/skills/skill-vetting/references

# Copy SKILL.md
cp SKILL.md ~/.claude/skills/skill-vetting/SKILL.md

# Copy reference files
cp references/hook-audit.md ~/.claude/skills/skill-vetting/references/hook-audit.md
cp references/permission-scope.md ~/.claude/skills/skill-vetting/references/permission-scope.md
cp references/threat-model.md ~/.claude/skills/skill-vetting/references/threat-model.md
cp references/trigger-analysis.md ~/.claude/skills/skill-vetting/references/trigger-analysis.md
cp references/trust-tiers.md ~/.claude/skills/skill-vetting/references/trust-tiers.md
cp references/vetting-workflow.md ~/.claude/skills/skill-vetting/references/vetting-workflow.md
```

## Phase 4: Customization (Optional)
Create a customization file to override defaults:
```bash
mkdir -p ~/.claude/skill-customizations/skill-vetting
cat > ~/.claude/skill-customizations/skill-vetting/PREFERENCES.md << 'EOF'
# Skill Customization: skill-vetting
# Add your preferences below
EOF
```

## Phase 5: Verify Installation
Run the verification checklist: see VERIFY.md
