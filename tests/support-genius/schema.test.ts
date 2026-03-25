/**
 * Schema and structure validation tests for the SupportGenius AI
 * agentcompanies/v1 company package located at agents/support-genius/.
 *
 * These tests run without a live Paperclip server and validate that every
 * file in the package:
 *   - exists on disk
 *   - has front-matter with expected top-level keys
 *   - satisfies the agentcompanies/v1 invariants (no orphan agents, no cycles,
 *     consistent secret declarations, portable task schedules)
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../agents/support-genius");

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

/** Extract top-level key-value pairs from front-matter delimiters (handles CRLF). Not a full YAML parser — only extracts flat key: value lines. */
function parseFrontmatter(content: string): Record<string, unknown> {
  const normalised = content.replace(/\r\n/g, "\n");
  const match = normalised.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, unknown> = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    if (key) result[key] = val;
  }
  return result;
}

// ---------------------------------------------------------------------------
// 1. Required top-level files
// ---------------------------------------------------------------------------

describe("Top-level package files", () => {
  const required = [
    "COMPANY.md",
    "README.md",
    "LICENSE",
    ".paperclip.yaml",
  ] as const;

  for (const file of required) {
    it(`${file} exists`, () => {
      expect(fileExists(file)).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// 2. COMPANY.md schema
// ---------------------------------------------------------------------------

describe("COMPANY.md frontmatter", () => {
  const content = readFile("COMPANY.md");
  const fm = parseFrontmatter(content);

  it("has schema: agentcompanies/v1", () => {
    expect(fm.schema).toBe("agentcompanies/v1");
  });

  it("has name", () => {
    expect(fm.name).toBeTruthy();
  });

  it("has description", () => {
    expect(fm.description).toBeTruthy();
  });

  it("has slug: support-genius", () => {
    expect(fm.slug).toBe("support-genius");
  });

  it("declares required secret HELPDESK_API_KEY", () => {
    expect(content).toMatch(/required:/);
    expect(content).toMatch(/- HELPDESK_API_KEY/);
  });

  it("declares required secret EMAIL_SERVICE_KEY", () => {
    expect(content).toMatch(/- EMAIL_SERVICE_KEY/);
  });

  it("declares optional integration secrets", () => {
    expect(content).toMatch(/optional:/);
    expect(content).toMatch(/SLACK_WEBHOOK_URL|JIRA_API_TOKEN|ZENDESK_API_TOKEN/);
  });

  it("declares optional alerting secrets", () => {
    expect(content).toMatch(/PAGERDUTY_API_KEY|TEAMS_WEBHOOK_URL/);
  });
});

// ---------------------------------------------------------------------------
// 3. All 8 agent AGENTS.md files
// ---------------------------------------------------------------------------

const AGENT_SLUGS = [
  "ceo",
  "support-director",
  "l1-support",
  "l2-support",
  "l3-specialist",
  "knowledge-manager",
  "sla-monitor",
  "csat-analyst",
] as const;

describe("Agent definitions", () => {
  for (const slug of AGENT_SLUGS) {
    const relPath = `agents/${slug}/AGENTS.md`;

    it(`${relPath} exists`, () => {
      expect(fileExists(relPath)).toBe(true);
    });

    it(`${relPath} has name in frontmatter`, () => {
      const fm = parseFrontmatter(readFile(relPath));
      expect(fm.name).toBeTruthy();
    });

    it(`${relPath} has title in frontmatter`, () => {
      const fm = parseFrontmatter(readFile(relPath));
      expect(fm.title).toBeTruthy();
    });

    it(`${relPath} has reportsTo in frontmatter`, () => {
      const content = readFile(relPath);
      expect(content).toMatch(/reportsTo:/);
    });

    it(`${relPath} includes paperclip skill`, () => {
      const content = readFile(relPath);
      expect(content).toMatch(/- paperclip/);
    });
  }

  it("CEO has reportsTo: null", () => {
    const content = readFile("agents/ceo/AGENTS.md");
    expect(content).toMatch(/reportsTo:\s*null/);
  });

  it("all non-CEO agents have non-null reportsTo", () => {
    for (const slug of AGENT_SLUGS) {
      if (slug === "ceo") continue;
      const content = readFile(`agents/${slug}/AGENTS.md`);
      expect(content).not.toMatch(/reportsTo:\s*null/);
    }
  });

  it("has exactly 8 agent directories", () => {
    const agentsDir = path.join(ROOT, "agents");
    const dirs = fs
      .readdirSync(agentsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    expect(dirs).toHaveLength(8);
  });
});

// ---------------------------------------------------------------------------
// 4. Org tree — no cycles, all trace to CEO
// ---------------------------------------------------------------------------

describe("Org tree integrity", () => {
  type AgentNode = { name: string; reportsTo: string | null };

  function loadAgentNode(slug: string): AgentNode {
    const content = readFile(`agents/${slug}/AGENTS.md`);
    const fm = parseFrontmatter(content);
    const reportsTo =
      typeof fm.reportsTo === "string" && fm.reportsTo !== "null"
        ? fm.reportsTo
        : null;
    const name = typeof fm.name === "string" ? fm.name : slug;
    return { name, reportsTo };
  }

  const nodes = Object.fromEntries(
    AGENT_SLUGS.map((s) => [s, loadAgentNode(s)])
  );

  it("exactly one agent has reportsTo: null (CEO)", () => {
    const roots = Object.values(nodes).filter((n) => n.reportsTo === null);
    expect(roots).toHaveLength(1);
  });

  it("all non-root agents have a reportsTo that resolves to a known agent slug", () => {
    const allSlugs = new Set(AGENT_SLUGS as readonly string[]);
    for (const [slug, node] of Object.entries(nodes)) {
      if (node.reportsTo === null) continue;
      expect(
        allSlugs.has(node.reportsTo),
        `${slug} reportsTo "${node.reportsTo}" which is not a known agent slug`
      ).toBe(true);
    }
  });

  it("support-director reports to ceo", () => {
    expect(nodes["support-director"].reportsTo).toBe("ceo");
  });

  it("l1-support, l2-support, and l3-specialist all report to support-director", () => {
    expect(nodes["l1-support"].reportsTo).toBe("support-director");
    expect(nodes["l2-support"].reportsTo).toBe("support-director");
    expect(nodes["l3-specialist"].reportsTo).toBe("support-director");
  });

  it("knowledge-manager, sla-monitor, and csat-analyst all report directly to ceo", () => {
    expect(nodes["knowledge-manager"].reportsTo).toBe("ceo");
    expect(nodes["sla-monitor"].reportsTo).toBe("ceo");
    expect(nodes["csat-analyst"].reportsTo).toBe("ceo");
  });
});

// ---------------------------------------------------------------------------
// 5. Teams
// ---------------------------------------------------------------------------

const TEAM_SLUGS = ["support", "knowledge-quality", "operations"] as const;

describe("Team definitions", () => {
  for (const slug of TEAM_SLUGS) {
    it(`teams/${slug}/TEAM.md exists`, () => {
      expect(fileExists(`teams/${slug}/TEAM.md`)).toBe(true);
    });

    it(`teams/${slug}/TEAM.md has name and manager`, () => {
      const content = readFile(`teams/${slug}/TEAM.md`);
      expect(content).toMatch(/name:/);
      expect(content).toMatch(/manager:/);
    });
  }

  it("has exactly 3 team directories", () => {
    const teamsDir = path.join(ROOT, "teams");
    const dirs = fs
      .readdirSync(teamsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    expect(dirs).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// 6. IT Helpdesk Launch project + seed tasks
// ---------------------------------------------------------------------------

const SEED_TASKS = [
  "ticket-triage-workflow",
  "faq-knowledge-base",
  "l2-runbook-library",
  "sla-monitoring-dashboard",
  "csat-survey-integration",
  "escalation-path-configuration",
  "knowledge-gap-analysis",
] as const;

describe("IT Helpdesk Launch project", () => {
  it("PROJECT.md exists", () => {
    expect(
      fileExists("projects/it-helpdesk-launch/PROJECT.md")
    ).toBe(true);
  });

  it("PROJECT.md has name and owner", () => {
    const content = readFile("projects/it-helpdesk-launch/PROJECT.md");
    expect(content).toMatch(/name:/);
    expect(content).toMatch(/owner:/);
  });

  for (const task of SEED_TASKS) {
    const relPath = `projects/it-helpdesk-launch/tasks/${task}/TASK.md`;

    it(`${relPath} exists`, () => {
      expect(fileExists(relPath)).toBe(true);
    });

    it(`${relPath} has name in frontmatter`, () => {
      const fm = parseFrontmatter(readFile(relPath));
      expect(fm.name).toBeTruthy();
    });

    it(`${relPath} has assignee in frontmatter`, () => {
      const content = readFile(relPath);
      expect(content).toMatch(/assignee:/);
    });

    it(`${relPath} has project: it-helpdesk-launch`, () => {
      const content = readFile(relPath);
      expect(content).toMatch(/project:\s*it-helpdesk-launch/);
    });
  }
});

// ---------------------------------------------------------------------------
// 7. Recurring tasks — portable (recurring: true, no schedule block)
// ---------------------------------------------------------------------------

const RECURRING_TASKS = [
  "daily-support-standup",
  "weekly-csat-report",
  "sla-queue-health-check",
] as const;

describe("Recurring task portability", () => {
  for (const task of RECURRING_TASKS) {
    const relPath = `tasks/${task}/TASK.md`;

    it(`${relPath} exists`, () => {
      expect(fileExists(relPath)).toBe(true);
    });

    it(`${relPath} has recurring: true`, () => {
      const content = readFile(relPath);
      expect(content).toMatch(/recurring:\s*true/);
    });

    it(`${relPath} does NOT contain a concrete startsAt timestamp`, () => {
      const content = readFile(relPath);
      expect(content).not.toMatch(/startsAt:/);
    });

    it(`${relPath} does NOT contain a schedule: block (schedule lives in .paperclip.yaml)`, () => {
      const content = readFile(relPath);
      expect(content).not.toMatch(/^schedule:/m);
    });
  }

  it("daily-support-standup is assigned to support-director", () => {
    const content = readFile("tasks/daily-support-standup/TASK.md");
    expect(content).toMatch(/assignee:\s*support-director/);
  });

  it("weekly-csat-report is assigned to csat-analyst", () => {
    const content = readFile("tasks/weekly-csat-report/TASK.md");
    expect(content).toMatch(/assignee:\s*csat-analyst/);
  });

  it("sla-queue-health-check is assigned to sla-monitor", () => {
    const content = readFile("tasks/sla-queue-health-check/TASK.md");
    expect(content).toMatch(/assignee:\s*sla-monitor/);
  });
});

// ---------------------------------------------------------------------------
// 8. .paperclip.yaml — heartbeat config and routines
// ---------------------------------------------------------------------------

describe(".paperclip.yaml", () => {
  const content = readFile(".paperclip.yaml");

  it("has schema: paperclip/v1", () => {
    expect(content).toMatch(/schema:\s*paperclip\/v1/);
  });

  it("declares heartbeat config for all 8 agents", () => {
    for (const slug of AGENT_SLUGS) {
      expect(content).toMatch(new RegExp(`${slug}:`));
    }
    expect(content.match(/intervalSec:\s*300/g)?.length).toBe(8);
    expect(content.match(/wakeOnDemand:\s*true/g)?.length).toBe(8);
  });

  it("declares HELPDESK_API_KEY as required for l1-support", () => {
    expect(content).toMatch(/HELPDESK_API_KEY:/);
    expect(content).toMatch(/requirement:\s*required/);
  });

  it("declares EMAIL_SERVICE_KEY as required", () => {
    expect(content).toMatch(/EMAIL_SERVICE_KEY:/);
  });

  it("declares optional integration secrets", () => {
    expect(content).toMatch(/SLACK_WEBHOOK_URL:/);
    expect(content).toMatch(/JIRA_API_TOKEN:/);
    expect(content).toMatch(/requirement:\s*optional/);
  });

  it("declares all 3 routines", () => {
    expect(content).toMatch(/routines:/);
    expect(content).toMatch(/daily-support-standup:/);
    expect(content).toMatch(/weekly-csat-report:/);
    expect(content).toMatch(/sla-queue-health-check:/);
  });

  it("routines have cron schedules", () => {
    const cronMatches = content.match(/cron:/g);
    expect(cronMatches?.length).toBe(3);
  });

  it("daily-support-standup routine points to the correct task file", () => {
    expect(content).toMatch(
      /daily-support-standup:\s*[\s\S]*?task:\s*tasks\/daily-support-standup\/TASK\.md/
    );
  });

  it("weekly-csat-report routine points to the correct task file", () => {
    expect(content).toMatch(
      /weekly-csat-report:\s*[\s\S]*?task:\s*tasks\/weekly-csat-report\/TASK\.md/
    );
  });

  it("sla-queue-health-check routine points to the correct task file", () => {
    expect(content).toMatch(
      /sla-queue-health-check:\s*[\s\S]*?task:\s*tasks\/sla-queue-health-check\/TASK\.md/
    );
  });

  it("routines use UTC timezone", () => {
    expect(content).toMatch(/timezone:\s*UTC/);
  });

  it("sla-queue-health-check uses a frequent cron schedule (every 15 minutes)", () => {
    expect(content).toMatch(/\*\/15 \* \* \* \*/);
  });
});

// ---------------------------------------------------------------------------
// 9. README.md — structure and content checks
// ---------------------------------------------------------------------------

describe("README.md", () => {
  const content = readFile("README.md");

  it("does not hardcode a personal fork URL", () => {
    expect(content).not.toMatch(/github\.com\/abhilashjaiswal0110/);
  });

  it("uses the canonical paperclipai/paperclip URL", () => {
    expect(content).toMatch(/github\.com\/paperclipai\/paperclip/);
  });

  it("has Org Chart section", () => {
    expect(content).toMatch(/## Org Chart/);
  });

  it("has Getting Started section", () => {
    expect(content).toMatch(/## Getting Started/);
  });

  it("documents all four SLA commitments (response time, FCR, CSAT, breach rate)", () => {
    expect(content).toMatch(/2.hour|2 hour|< 2/i);
    expect(content).toMatch(/95%/);
    expect(content).toMatch(/4\.8/);
    expect(content).toMatch(/1%/);
  });

  it("documents the ticket escalation chain", () => {
    expect(content).toMatch(/[Ee]scalation/);
    expect(content).toMatch(/L1|L2|L3/);
  });

  it("has Teams section", () => {
    expect(content).toMatch(/## Teams/);
  });

  it("has Projects section", () => {
    expect(content).toMatch(/## Projects/);
  });

  it("has Recurring Tasks section", () => {
    expect(content).toMatch(/## Recurring Tasks/);
  });
});

// ---------------------------------------------------------------------------
// 10. Agent-specific content checks
// ---------------------------------------------------------------------------

describe("Agent content checks", () => {
  it("l1-support AGENTS.md mentions KB / knowledge base", () => {
    const content = readFile("agents/l1-support/AGENTS.md");
    expect(content).toMatch(/[Kk]nowledge [Bb]ase|KB/);
  });

  it("l1-support AGENTS.md mentions triage and classification", () => {
    const content = readFile("agents/l1-support/AGENTS.md");
    expect(content).toMatch(/[Tt]riage|[Cc]lassif/);
  });

  it("l2-support AGENTS.md mentions runbook", () => {
    const content = readFile("agents/l2-support/AGENTS.md");
    expect(content).toMatch(/[Rr]unbook/);
  });

  it("l2-support AGENTS.md mentions diagnostic", () => {
    const content = readFile("agents/l2-support/AGENTS.md");
    expect(content).toMatch(/[Dd]iagnos/);
  });

  it("l3-specialist AGENTS.md mentions root cause analysis", () => {
    const content = readFile("agents/l3-specialist/AGENTS.md");
    expect(content).toMatch(/[Rr]oot [Cc]ause/);
  });

  it("l3-specialist AGENTS.md mentions post-mortem", () => {
    const content = readFile("agents/l3-specialist/AGENTS.md");
    expect(content).toMatch(/[Pp]ost.mortem|post-mortem/);
  });

  it("knowledge-manager AGENTS.md mentions KB deflection rate", () => {
    const content = readFile("agents/knowledge-manager/AGENTS.md");
    expect(content).toMatch(/[Dd]eflection/);
  });

  it("knowledge-manager AGENTS.md mentions PII gate", () => {
    const content = readFile("agents/knowledge-manager/AGENTS.md");
    expect(content).toMatch(/PII/);
  });

  it("sla-monitor AGENTS.md mentions <1% breach rate", () => {
    const content = readFile("agents/sla-monitor/AGENTS.md");
    expect(content).toMatch(/1%|breach rate/);
  });

  it("sla-monitor AGENTS.md defines P1/P2/P3/P4 severity tiers", () => {
    const content = readFile("agents/sla-monitor/AGENTS.md");
    expect(content).toMatch(/P1/);
    expect(content).toMatch(/P2/);
    expect(content).toMatch(/P3/);
    expect(content).toMatch(/P4/);
  });

  it("csat-analyst AGENTS.md mentions 4.8/5 CSAT target", () => {
    const content = readFile("agents/csat-analyst/AGENTS.md");
    expect(content).toMatch(/4\.8/);
  });

  it("csat-analyst AGENTS.md mentions survey delivery", () => {
    const content = readFile("agents/csat-analyst/AGENTS.md");
    expect(content).toMatch(/[Ss]urvey/);
  });

  it("support-director AGENTS.md mentions first-contact resolution", () => {
    const content = readFile("agents/support-director/AGENTS.md");
    expect(content).toMatch(/[Ff]irst.contact|first-contact/);
  });

  it("support-director AGENTS.md mentions 95% FCR target", () => {
    const content = readFile("agents/support-director/AGENTS.md");
    expect(content).toMatch(/95%/);
  });
});
