# Install: Persistent Memory

## Phase 1: Prerequisites Check
- [ ] Claude Code installed and running

## Phase 2: Configuration
Set up the following hooks in `~/.claude/settings.json`:
```json
{
  "hooks": {
    "PostToolUse": [{ "hooks": [{ "type": "command", "command": "/abs/path/to/hook.sh" }] }]
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "/abs/path/to/hook.sh" }] }]
    "Stop": [{ "hooks": [{ "type": "command", "command": "/abs/path/to/hook.sh" }] }]
  }
}
```

**Critical:** Use absolute paths in hook commands. Relative paths silently fail.

Choose your preferred defaults:
- Create `~/.claude/skill-customizations/persistent-memory/PREFERENCES.md` with your choices (see Phase 4)

## Phase 3: Installation
Copy skill files to your Claude Code skills directory:

```bash
# Create skill directory
mkdir -p ~/.claude/skills/persistent-memory/references

# Copy SKILL.md
cp SKILL.md ~/.claude/skills/persistent-memory/SKILL.md

# Copy reference files
cp references/anti-patterns.md ~/.claude/skills/persistent-memory/references/anti-patterns.md
cp references/hooks.md ~/.claude/skills/persistent-memory/references/hooks.md
cp references/memory-types.md ~/.claude/skills/persistent-memory/references/memory-types.md
cp references/walkthrough.md ~/.claude/skills/persistent-memory/references/walkthrough.md
```

## Phase 4: Customization (Optional)
Create a customization file to override defaults:
```bash
mkdir -p ~/.claude/skill-customizations/persistent-memory
cat > ~/.claude/skill-customizations/persistent-memory/PREFERENCES.md << 'EOF'
# Skill Customization: persistent-memory
# Add your preferences below
EOF
```

## Phase 5: Verify Installation
Run the verification checklist: see VERIFY.md
