# Trust Tiers and Policy

## Why Tiers Matter

Not every skill deserves a full 5-layer audit every time. Tiers let you apply appropriate scrutiny based on source provenance. Spending 10 minutes vetting your own skill from last week is waste. Installing an anonymous GitHub skill with zero review is reckless. Tiers calibrate the investment.

## Trust Tier Definitions

### Tier 1: Trusted

**Sources:**
- Skills you wrote yourself
- Skills from teammates whose code you've reviewed and trust
- Skills from your organization's internal catalog (version controlled, peer reviewed)

**Audit depth:** Layer 5 only (quality check — make sure it still works and hasn't rotted)

**Frequency:** Only when the skill changes

---

### Tier 2: Community

**Sources:**
- ClawHub skills with 1,000+ downloads AND at least some reviews
- Well-known Claude Code ecosystem authors (recognized names, maintained repos)
- Skills linked from official Anthropic documentation or examples

**Audit depth:** Full Layers 1-5 (standard vetting)

**Note:** Download count is a floor, not a guarantee. The external skill-vetter has 110K downloads because trust-by-popularity is a real failure mode — 110K people installing without auditing is not 110K audits.

**Frequency:** On first install, and on every major version bump (check diff for new hooks/permissions)

---

### Tier 3: Untrusted

**Sources:**
- Anonymous GitHub repos (no identity, no history)
- One-off links shared in Discord/Slack without context
- Skills with no documentation, no test cases, no version history
- Skills modified locally but sourced from an unknown original

**Audit depth:** Full Layers 1-5 + manually read every single hook command + verify every URL

**Frequency:** Full audit on every install. Do not carry forward trust from a previous version.

---

## Setting Your Personal Trust Policy

Write this once into your CLAUDE.md or keep it as a reference:

```markdown
## Skill Trust Policy

- Tier 1 (own/team): Layer 5 check only, install immediately
- Tier 2 (community 1K+): Full 5-layer audit before install
- Tier 3 (unknown): Full 5-layer + manual hook read, post findings if issues found

Auto-classify by source:
- github.com/[my-username]/* → Tier 1
- github.com/[team-org]/* → Tier 1
- clawhub.ai/* with downloads > 1000 → Tier 2
- Everything else → Tier 3
```

## Tier Demotion Rules

A skill starts at its source tier but can be demoted:
- Any Critical finding → Tier 3 regardless of source
- Any obfuscated command → Tier 3, manual read required
- Hooks added in a minor version bump → temporarily Tier 3 until re-audited
- Author repo shows recent credential exposure, compromise, or ownership transfer → Tier 3

## What Tiers Don't Do

Tiers classify audit depth, not safety. A Tier 2 skill that fails Layer 2 is still a FAIL. Trust tiers control how much effort you spend before you decide — they don't override the findings.
