# Full Vetting Workflow

## Setup

Before starting, gather:
- [ ] The SKILL.md file (copy or path)
- [ ] All files in `references/` if available
- [ ] The skill's settings.json entries (if provided) or any hook configs
- [ ] Your current installed skill list (for trigger overlap check)
- [ ] The source URL (for trust tier classification)

---

## Layer 1: Trigger Analysis (2 min)

```
[ ] Read description: frontmatter in full
[ ] Count trigger phrases (flag if < 3 or > 12)
[ ] Identify NOT-for exclusions (flag if absent)
[ ] Check for generic/single-word triggers
[ ] Scan your installed skill list for overlap
```

**Record findings:** severity (Critical/High/Medium/Low) + specific phrase flagged.

---

## Layer 2: Hook Audit (5 min)

```
[ ] Locate all hook configs for this skill (settings.json PreToolUse, PostToolUse, Stop)
[ ] For each hook command:
    [ ] Read the full command — no skimming
    [ ] Ask: "Where does data go?"
    [ ] Ask: "Does this read sensitive files?"
    [ ] Ask: "Does this spawn background processes?"
    [ ] Ask: "Is this command immediately understandable?"
[ ] Cross-check any URLs against known-safe domains
```

If no hooks present: note "No hooks — Layer 2 N/A."

---

## Layer 3: Permission Scope (2 min)

```
[ ] List all permissions requested
[ ] State the skill's stated purpose (one sentence)
[ ] For each permission: does the stated purpose require it?
[ ] Check for bash:* (flag unless justified)
[ ] Calculate combined permission footprint
```

---

## Layer 4: API Endpoint Verification (2 min)

```
[ ] Search SKILL.md and all references/ for:
    [ ] Hardcoded URLs (http:// or https://)
    [ ] WebFetch calls
    [ ] curl/wget patterns
[ ] For each URL: is this a well-known public API or the author's own domain?
[ ] Flag any URL that isn't immediately identifiable
```

---

## Layer 5: Quality Signals (1 min)

```
[ ] references/test-cases.md exists and has real scenarios? (not empty)
[ ] Reference files are substantive (>10 lines each)?
[ ] Trigger set has NOT-for exclusions?
[ ] Trigger count 3-12?
[ ] No empty stub files?
```

---

## Verdict Assembly

After all 5 layers:

1. List all findings by severity
2. Apply verdict rule:
   - Any Critical → FAIL
   - Any High with no justification → CONDITIONAL (if remediable) or FAIL
   - Only Medium/Low → PASS with notes

3. Write the verdict block:
```
VERDICT: [PASS / FAIL / CONDITIONAL]
Source: [url]
Trust Tier: [Trusted / Community / Untrusted]

Critical: [finding or NONE]
High:     [finding or NONE]
Medium:   [finding or NONE]
Low:      [finding or NONE]

Recommendation: [install / do not install / install after: specific remediation]
```

---

## Post-Vet Checklist

If PASS or CONDITIONAL:
- [ ] Note any permissions being added to settings.json
- [ ] Record the skill source URL in your personal skill log
- [ ] Schedule a re-audit if the skill ships updates

If FAIL:
- [ ] Do not install
- [ ] If community skill: consider filing an issue or reporting on the platform
- [ ] If team skill: bring findings to the author before the next review cycle
