# Deep Investigation Workflow

A progressive iterative research workflow that builds a persistent knowledge vault across sessions. Unlike the standard brief workflow (one-shot), Deep Investigation does broad landscape analysis first, discovers and scores entities, then deep-dives the highest-value ones one per iteration.

## When to Use

Triggered by: "deep investigation", "investigate [topic]", "map the landscape", "comprehensive research on [domain]"

NOT for: standard skill opportunity briefs → use the inline workflow in AGENTS.md instead.

## Step 0: Iteration Detection

Check `~/.claude/research-vaults/` for a vault matching the topic:

```
Neither LANDSCAPE.md nor ENTITIES.md exists → FIRST ITERATION (go to Step 1)
LANDSCAPE.md exists AND ENTITIES.md has PENDING CRITICAL/HIGH entities → CONTINUATION (go to Step 3)
All CRITICAL/HIGH entities are RESEARCHED (or SKIP) → COMPLETE (go to Step 4)
```

To find an existing vault, look for a directory named `YYYY-MM-DD_topic-slug` where the slug matches the investigation topic. If multiple partial matches exist, ask for clarification.

## Step 1: First Iteration — Landscape

1. Create vault directory:
   ```
   ~/.claude/research-vaults/YYYY-MM-DD_topic-slug/
   ```
   Use today's date and a 3-5 word kebab-case slug for the topic.

2. Launch 3 parallel research agents using your existing data sources:
   - **Agent 1 (Quantitative):** ClawHub + GitHub issues — hard download numbers, issue counts, upvotes
   - **Agent 2 (Sentiment):** Grok web search — developer sentiment, trends, recent developments
   - **Agent 3 (Community):** YouTube + Reddit — content landscape, community pain points, workflow discussions

3. Synthesize agent outputs into `LANDSCAPE.md`:
   ```markdown
   # [Topic] — Landscape

   ## Domain Overview
   [3-5 paragraphs: what this space is, why it matters, who's in it]

   ## Key Trends
   - [bullet points from Grok/Reddit/YouTube]

   ## Demand Evidence
   - [quantitative signals from ClawHub/GitHub]

   ## Open Questions
   - [gaps that deep-dives should resolve]
   ```

4. Extract discovered entities into `ENTITIES.md` with initial scoring. See `docs/conventions/research-vault.md` for the full format and scoring rubric. Every entity found in the landscape phase goes in — don't filter yet, just score.

5. Create `INDEX.md`:
   ```markdown
   # [Topic] — Investigation Index

   **Started:** YYYY-MM-DD
   **Status:** In Progress

   ## Artifacts
   - [LANDSCAPE.md](LANDSCAPE.md) — Broad domain overview
   - [ENTITIES.md](ENTITIES.md) — Entity catalog (N pending, N researched)

   ## Entity Profiles
   [Updated each iteration as profiles are written]
   ```

6. Immediately proceed to Step 2 to deep-dive the first entity.

## Step 2: First Deep-Dive

After creating LANDSCAPE.md and ENTITIES.md, pick the highest-value PENDING entity (CRITICAL first, then HIGH) and run Step 3 for it. This means the first iteration produces: LANDSCAPE.md + ENTITIES.md + INDEX.md + one entity profile.

## Step 3: Continuation — Entity Deep-Dive

Each continuation iteration handles exactly one entity.

1. Read `ENTITIES.md` — find the first `PENDING` entity with `CRITICAL` value. If none, find first `PENDING` with `HIGH` value.

2. Research that entity using 1-2 targeted data sources. Choose based on what's most useful for this entity:
   - High-download tools → ClawHub for competitive numbers
   - Active communities → Reddit/GitHub issues for pain points
   - Recent developments → Grok for news and sentiment
   - Tutorial coverage → YouTube for content landscape

3. Write entity profile to `entities/[slug].md`. Use the template from `docs/conventions/research-vault.md`. Slug is the entity name in kebab-case.

4. Update `ENTITIES.md`:
   - Change entity's `Status` from `PENDING` to `RESEARCHED`
   - Add profile path in the `Profile` column: `entities/[slug].md`

5. Update `INDEX.md` — add the new profile to the Entity Profiles section with a link and one-line summary.

## Step 4: Completion

Report when all CRITICAL and HIGH entities are RESEARCHED or SKIP'd:

```
Investigation complete for [topic].

Vault: ~/.claude/research-vaults/[vault-name]/
Entities researched: N
Entities skipped: N (with reasons in ENTITIES.md)
Categories covered: [list]

Key findings:
- [3-5 bullet points from the investigation]

Recommended next action: [brief, post, or further investigation]
```

## Vault Management Helpers

**List existing vaults:**
```bash
ls ~/.claude/research-vaults/
```

**Check vault status:**
```bash
head -20 ~/.claude/research-vaults/[vault]/ENTITIES.md
```

**The workflow is stateless.** All state lives in vault artifacts. Any session can resume any vault by reading ENTITIES.md and picking up at the first PENDING CRITICAL/HIGH entity. Do not run multiple sessions on the same vault concurrently.
