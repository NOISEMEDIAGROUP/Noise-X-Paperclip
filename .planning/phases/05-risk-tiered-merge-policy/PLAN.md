# Phase 5 Plan: Risk-Tiered Merge Policy

## Goal
Increase merge throughput without reducing safety.

## Tasks
1. Create doc/MERGE_POLICY.md defining low/medium/high risk taxonomy, path patterns, and review requirements
2. Add risk-tier classification step to pr-policy.yml CI workflow
3. Define fast lane rules for low-risk PRs
4. Add MERGE_POLICY.md to docs:lint required docs

## Verification
- docs:lint passes with MERGE_POLICY.md
- pr-policy.yml classifies PRs by risk tier
