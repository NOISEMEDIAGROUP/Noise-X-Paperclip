# Test Log: skill-vetting

## Iteration 1 — 2026-03-17

### Trigger Tests

| # | Input | Fired? |
|---|---|---|
| T1 | "Vet this skill before I install it" | YES ✓ |
| T2 | "Is this skill safe to use?" (specific skill) | YES ✓ |
| T3 | "Audit this skill for hook injection risks" | YES ✓ |
| T4 | "Review the security of this skill I found on GitHub" | YES ✓ |
| T5 | "Can you check this skill's permission footprint?" | YES ✓ |
| T6 | "I want to vet the skill-creator skill before adding it" | YES ✓ |
| T7 | "Compare these two versions of a skill for security regressions" | YES ✓ |
| T8 | "Set up a trust policy for my skill sources" | YES ✓ |
| T9 | "Run a security audit on this SKILL.md" | YES ✓ |
| T10 | "This skill requests bash permissions — is that justified?" | YES ✓ |
| T11 | "Should I trust this skill from a random GitHub repo?" | YES ✓ |
| T12 | "Check for hook injection in this skill" | YES ✓ |

**Trigger score: 12/12 (100%)**

### No-Trigger Tests

| # | Input | Fired? |
|---|---|---|
| N1 | "How do I secure my Claude Code setup?" | NO ✓ |
| N2 | "Can you review my npm package for vulnerabilities?" | NO ✓ |
| N3 | "What are the security risks of MCP servers?" | NO ✓ |
| N4 | "Audit my CLAUDE.md for issues" | NO ✓ |
| N5 | "How do I install skills safely?" | NO ✓ |

**No-trigger score: 5/5 (100%)**

### Output Tests

Tested against: malicious skill scenario (broad trigger + exfiltration hook + bash:* + no test-cases.md)

| Assertion | Result |
|---|---|
| VERDICT block present with FAIL | PASS ✓ |
| Layer 2 hook finding as Critical | PASS ✓ |
| Specific curl command identified as exfiltration | PASS ✓ |
| Layer 1 trigger finding (generic, no NOT-for) | PASS ✓ |
| Layer 3 permission finding (bash:* unjustified) | PASS ✓ |
| Layer 5 quality finding (no test-cases.md) | PASS ✓ |
| Severity ratings per finding | PASS ✓ |
| Recommendation: do not install | PASS ✓ |

Tested against: clean skill scenario (precise trigger + no hooks + scoped permissions + full tests)

| Assertion | Result |
|---|---|
| VERDICT PASS | PASS ✓ |
| All 5 layers evaluated | PASS ✓ |
| Clean findings noted per layer | PASS ✓ |
| Recommendation: install | PASS ✓ |

Tested against: comparison vet scenario (v2 adds suspicious PostToolUse hook)

| Assertion | Result |
|---|---|
| New hook flagged | PASS ✓ |
| CONDITIONAL or FAIL verdict | PASS ✓ |
| Diff summary showing what changed | PASS ✓ |

**Output score: 15/15 (100%)**

---

### Final Score

| Category | Score |
|---|---|
| Trigger | 12/12 (100%) |
| No-Trigger | 5/5 (100%) |
| Output | 15/15 (100%) |
| **Total** | **32/32 (100%)** |

**Status: PASS — ready for QC**
