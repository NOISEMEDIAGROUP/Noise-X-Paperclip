---
name: qa-verify
description: |
  QA verification for Paperclip agents using gstack's headless browser. Navigate URLs,
  interact with elements, verify page state, take screenshots, test forms, and check
  responsive layouts. Use when agents need to visually verify their work, test deployments,
  or dogfood user flows. Requires gstack browse binary.
---

# QA Verify (Paperclip Agent)

You are running QA verification within a Paperclip heartbeat. Use the headless browser
to verify that code changes actually work from the user's perspective.

## Prerequisites

```bash
B=""
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
[ -z "$B" ] && B=~/.claude/skills/gstack/browse/dist/browse
if [ -x "$B" ]; then
  echo "BROWSER_READY: $B"
else
  echo "BROWSER_NOT_AVAILABLE"
fi
```

If browser is not available, fall back to non-visual verification (curl, API calls, log checks).

## When to use

Use this skill:
- After deploying changes to verify they work
- When assigned a QA or testing task
- Before shipping to verify critical user flows
- When investigating a bug report

## QA Methodology

### Tier 1: Quick Smoke (critical paths only)
- Does the page load?
- Do critical buttons/links work?
- Any console errors?

### Tier 2: Standard (functional coverage)
- All Tier 1 checks
- Form submissions work correctly
- Navigation flows complete
- Error states display properly
- Data persists across page loads

### Tier 3: Exhaustive (regression)
- All Tier 2 checks
- Responsive layout verification (mobile, tablet, desktop)
- Edge cases (empty states, long content, special characters)
- Performance (slow network, large datasets)

## Core Workflows

### Verify a deployment

```bash
$B goto <URL>
$B text                          # does it load?
$B console                       # any JS errors?
$B network                       # any failed requests?
$B screenshot /tmp/deploy-check.png
```

### Test a user flow

```bash
# 1. Navigate
$B goto <URL>

# 2. See interactive elements
$B snapshot -i

# 3. Interact using @e refs
$B fill @e3 "test input"
$B click @e5

# 4. Verify result
$B snapshot -D              # diff shows what changed
$B is visible ".success"   # assert element exists
$B screenshot /tmp/result.png
```

### Check responsive layouts

```bash
$B goto <URL>
$B responsive /tmp/layout   # screenshots at mobile/tablet/desktop
```

### Test forms with validation

```bash
$B goto <URL>
$B snapshot -i

# Submit empty — check validation
$B click @e10              # submit button
$B snapshot -D             # errors should appear
$B is visible ".error"

# Fill and resubmit
$B fill @e3 "valid input"
$B click @e10
$B snapshot -D             # success state
```

## Reporting

Output QA results in this format:

```markdown
## QA Report: [what was tested]

### Environment
- URL: [tested URL]
- Branch: [branch name]
- Tier: Quick / Standard / Exhaustive

### Results
| Check | Status | Notes |
|-------|--------|-------|
| Page loads | PASS/FAIL | |
| Console errors | PASS/FAIL | [errors if any] |
| [User flow] | PASS/FAIL | |
| Responsive | PASS/FAIL | |

### Screenshots
[List of screenshot paths]

### Issues Found
1. [description] — Severity: Critical/Medium/Low

### Verdict
PASS — all checks passed
FAIL — N issues found (X critical)
```

Post the QA report as a Paperclip comment on the task.

## Browser Command Reference

### Navigation
| `goto <url>` | Navigate | `back` / `forward` | History | `reload` | Refresh |

### Reading
| `text` | Page text | `html [sel]` | HTML | `links` | All links | `forms` | Form fields |

### Interaction
| `click <sel>` | Click | `fill <sel> <val>` | Fill input | `press <key>` | Keypress |
| `hover <sel>` | Hover | `select <sel> <val>` | Dropdown | `upload <sel> <file>` | Upload |

### Inspection
| `is <prop> <sel>` | State check | `console` | JS console | `network` | Requests |
| `js <expr>` | Run JS | `attrs <sel>` | Attributes | `css <sel> <prop>` | CSS value |

### Snapshot
| `snapshot -i` | Interactive elements with @e refs | `snapshot -D` | Diff vs previous |
| `snapshot -a -o <path>` | Annotated screenshot | `snapshot -C` | Cursor-interactive elements |

### Visual
| `screenshot [path]` | Save screenshot | `responsive [prefix]` | Multi-viewport screenshots |
| `diff <url1> <url2>` | Text diff between pages |

## Rules

- Always start with `snapshot -i` to discover interactive elements
- Use `snapshot -D` after actions to verify changes
- Check `console` after interactions for JS errors
- Take screenshots as evidence for findings
- If the browser binary is unavailable, report it and use alternative verification methods
