---
title: Dirty PR commit history when contributing from a customized fork
category: git-workflow
tags: [git, fork, pr, upstream, rebase, open-source]
module: git
symptoms:
  - PR shows dozens of unrelated commits
  - PR diff includes changes from other local branches
  - Upstream maintainer sees messy commit history
root_cause: Feature branch created from local master that was ahead of upstream
date: 2026-03-09
---

# Dirty PR Commit History When Contributing From a Customized Fork

## Problem

When creating a PR to the upstream open-source repo (`paperclipai/paperclip`), the PR showed 39 commits instead of 1. The extra 38 commits were local-only work (approvals, notifications, trust features) that had been merged into our local `master` but never pushed to `origin/master`.

**What happened:** We branched off local `master` (which was 38 commits ahead of `origin/master`), made our 1-commit change, pushed to our fork, and opened a PR. GitHub included all 39 commits in the diff.

## Root Cause

Our repo has a **three-remote fork topology**:

```
origin  → paperclipai/paperclip   (upstream open-source repo)
fork    → StartupBros/paperclip   (our shared fork, customized)
gsxdsm  → gsxdsm/paperclip        (maintainer's personal fork)
```

Local `master` tracks `origin/master` but accumulates local-only commits from feature merges that are never pushed to origin. When creating upstream contributions, branching from local `master` includes all that unpushed work.

## Solution

### For PRs targeting upstream (`origin`): always branch from `origin/master`

```bash
# Fetch latest upstream
git fetch origin master

# Create feature branch from upstream master, NOT local master
git checkout -b feat/my-upstream-contribution origin/master

# ... make changes, commit ...

# Push to our fork
git push -u fork feat/my-upstream-contribution

# Create PR targeting upstream
gh pr create --repo paperclipai/paperclip --base master --head StartupBros:feat/my-upstream-contribution
```

### For PRs that depend on an unmerged upstream PR

```bash
# Fetch the base PR's branch
git fetch gsxdsm feature/plugins  # or whatever remote has it

# Branch from THAT, not local master
git checkout -b feat/my-extension FETCH_HEAD

# ... make changes, commit ...

# Push and PR as usual
git push -u fork feat/my-extension
gh pr create --repo paperclipai/paperclip --base master --head StartupBros:feat/my-extension
```

The PR will show commits from both your work AND the base PR. Once the base PR merges, GitHub automatically reduces the diff to just your commits.

### If you already messed up: rebase onto the correct base

```bash
# Rebase your single commit onto the correct base
git rebase --onto origin/master HEAD~1 feat/my-branch

# Force push (safe since it's your feature branch)
git push fork feat/my-branch --force-with-lease
```

If the base is an unmerged PR (not yet on origin/master):

```bash
git fetch <remote> <branch>
git rebase --onto FETCH_HEAD HEAD~1 feat/my-branch
git push fork feat/my-branch --force-with-lease
```

## Decision Framework

```
Q: Where does this PR go?
├── Upstream (origin/paperclipai) → Branch from origin/master
│   └── Depends on unmerged PR? → Branch from that PR's branch
└── Our fork only → Branch from local master (fine to include local work)
```

## Prevention

### Rule: Match branch base to PR target

| PR Target | Branch From | Push To |
|-----------|-------------|---------|
| `origin` (upstream) | `origin/master` or upstream PR branch | `fork` |
| `fork` (our repo) | local `master` | `fork` |

### Pre-push check

Before pushing an upstream contribution, verify the commit count:

```bash
# Should show ONLY your commits, not dozens of extras
git log --oneline origin/master..HEAD
```

If you see more commits than you made, you branched from the wrong base.

### Keep local master awareness

```bash
# Check how far ahead local master is from upstream
git rev-list --count origin/master..master
# If this is > 0, DO NOT branch from local master for upstream PRs
```
