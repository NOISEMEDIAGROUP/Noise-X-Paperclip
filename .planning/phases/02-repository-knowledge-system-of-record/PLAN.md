# Phase 2 Plan: Repository Knowledge as System of Record

## Goal
Make repo documentation legible for both humans and agents.

## Tasks
1. Create canonical knowledge docs: ARCHITECTURE.md, QUALITY_SCORE.md, RELIABILITY.md, SECURITY.md
2. Create ADR: doc/DECISIONS/0001-harness-engineering-adoption.md
3. Each doc has YAML frontmatter with Owner, Last Verified, Applies To, Links
4. Create scripts/docs-lint.mjs to validate doc existence, frontmatter, and local link integrity
5. Add pnpm docs:lint to package.json
6. Add docs:lint step to .github/workflows/pr-verify.yml before typecheck

## Verification
- pnpm docs:lint exits 0
