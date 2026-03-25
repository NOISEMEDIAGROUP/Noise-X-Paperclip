/**
 * Schema and structure validation tests for the CloudOps Pro
 * agentcompanies/v1 company package located at agents/cloudops-pro/.
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
const ROOT = path.resolve(__dirname, "../../agents/cloudops-pro");

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

  it("has slug: cloudops-pro", () => {
    expect(fm.slug).toBe("cloudops-pro");
  });

  it("declares required secret GH_TOKEN", () => {
    expect(content).toMatch(/required:/);
    expect(content).toMatch(/- GH_TOKEN/);
  });

  it("declares required secret AWS_ACCESS_KEY_ID", () => {
    expect(content).toMatch(/- AWS_ACCESS_KEY_ID/);
  });

  it("declares required secret AWS_SECRET_ACCESS_KEY", () => {
    expect(content).toMatch(/- AWS_SECRET_ACCESS_KEY/);
  });

  it("declares optional cloud provider secrets", () => {
    expect(content).toMatch(/optional:/);
    expect(content).toMatch(/AZURE_SUBSCRIPTION_ID|GCP_PROJECT_ID/);
  });

  it("declares optional observability secrets", () => {
    expect(content).toMatch(/PAGERDUTY_API_KEY|DATADOG_API_KEY|SLACK_WEBHOOK_URL/);
  });
});

// ---------------------------------------------------------------------------
// 3. All 8 agent AGENTS.md files
// ---------------------------------------------------------------------------

const AGENT_SLUGS = [
  "ceo",
  "cto",
  "cloud-architect",
  "devops-engineer",
  "sre",
  "finops-analyst",
  "security-ops",
  "program-manager",
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

  it("CTO reports to CEO", () => {
    expect(nodes["cto"].reportsTo).toBe("ceo");
  });

  it("cloud-architect, devops-engineer, and sre all report to cto", () => {
    expect(nodes["cloud-architect"].reportsTo).toBe("cto");
    expect(nodes["devops-engineer"].reportsTo).toBe("cto");
    expect(nodes["sre"].reportsTo).toBe("cto");
  });

  it("finops-analyst, security-ops, and program-manager all report directly to ceo", () => {
    expect(nodes["finops-analyst"].reportsTo).toBe("ceo");
    expect(nodes["security-ops"].reportsTo).toBe("ceo");
    expect(nodes["program-manager"].reportsTo).toBe("ceo");
  });
});

// ---------------------------------------------------------------------------
// 5. Teams
// ---------------------------------------------------------------------------

const TEAM_SLUGS = ["engineering", "governance", "finops"] as const;

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
// 6. Cloud Operations Platform project + seed tasks
// ---------------------------------------------------------------------------

const SEED_TASKS = [
  "iac-baseline",
  "cicd-zero-touch",
  "sre-monitoring-setup",
  "cost-optimisation-baseline",
  "security-drift-detection",
  "sla-reporting-dashboard",
  "incident-response-automation",
] as const;

describe("Cloud Operations Platform project", () => {
  it("PROJECT.md exists", () => {
    expect(
      fileExists("projects/cloud-operations-platform/PROJECT.md")
    ).toBe(true);
  });

  it("PROJECT.md has name and owner", () => {
    const content = readFile("projects/cloud-operations-platform/PROJECT.md");
    expect(content).toMatch(/name:/);
    expect(content).toMatch(/owner:/);
  });

  for (const task of SEED_TASKS) {
    const relPath = `projects/cloud-operations-platform/tasks/${task}/TASK.md`;

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

    it(`${relPath} has project: cloud-operations-platform`, () => {
      const content = readFile(relPath);
      expect(content).toMatch(/project:\s*cloud-operations-platform/);
    });
  }
});

// ---------------------------------------------------------------------------
// 7. Recurring tasks — portable (recurring: true, no schedule block)
// ---------------------------------------------------------------------------

const RECURRING_TASKS = [
  "daily-ops-standup",
  "weekly-cost-report",
  "sla-health-check",
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

  it("daily-ops-standup is assigned to program-manager", () => {
    const content = readFile("tasks/daily-ops-standup/TASK.md");
    expect(content).toMatch(/assignee:\s*program-manager/);
  });

  it("weekly-cost-report is assigned to finops-analyst", () => {
    const content = readFile("tasks/weekly-cost-report/TASK.md");
    expect(content).toMatch(/assignee:\s*finops-analyst/);
  });

  it("sla-health-check is assigned to sre", () => {
    const content = readFile("tasks/sla-health-check/TASK.md");
    expect(content).toMatch(/assignee:\s*sre/);
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

  it("declares GH_TOKEN as required for devops-engineer", () => {
    expect(content).toMatch(/GH_TOKEN:/);
    expect(content).toMatch(/requirement:\s*required/);
  });

  it("declares AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY as required", () => {
    expect(content).toMatch(/AWS_ACCESS_KEY_ID:/);
    expect(content).toMatch(/AWS_SECRET_ACCESS_KEY:/);
  });

  it("declares optional Azure and GCP secrets", () => {
    expect(content).toMatch(/AZURE_SUBSCRIPTION_ID:/);
    expect(content).toMatch(/GCP_PROJECT_ID:/);
    expect(content).toMatch(/requirement:\s*optional/);
  });

  it("declares all 3 routines", () => {
    expect(content).toMatch(/routines:/);
    expect(content).toMatch(/daily-ops-standup:/);
    expect(content).toMatch(/weekly-cost-report:/);
    expect(content).toMatch(/sla-health-check:/);
  });

  it("routines have cron schedules", () => {
    const cronMatches = content.match(/cron:/g);
    expect(cronMatches?.length).toBe(3);
  });

  it("daily-ops-standup routine points to the correct task file", () => {
    expect(content).toMatch(
      /daily-ops-standup:\s*[\s\S]*?task:\s*tasks\/daily-ops-standup\/TASK\.md/
    );
  });

  it("weekly-cost-report routine points to the correct task file", () => {
    expect(content).toMatch(
      /weekly-cost-report:\s*[\s\S]*?task:\s*tasks\/weekly-cost-report\/TASK\.md/
    );
  });

  it("sla-health-check routine points to the correct task file", () => {
    expect(content).toMatch(
      /sla-health-check:\s*[\s\S]*?task:\s*tasks\/sla-health-check\/TASK\.md/
    );
  });

  it("routines use UTC timezone", () => {
    expect(content).toMatch(/timezone:\s*UTC/);
  });

  it("sla-health-check uses a frequent cron schedule (every 15 minutes)", () => {
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

  it("documents all three SLA commitments (uptime, cost, deployments)", () => {
    expect(content).toMatch(/99\.9%/);
    expect(content).toMatch(/30%/);
    expect(content).toMatch(/[Zz]ero/);
  });

  it("documents the three-gate approval chain", () => {
    expect(content).toMatch(/[Gg]ate/);
    expect(content).toMatch(/[Ss]ecurity/);
    expect(content).toMatch(/[Cc]ost/);
    expect(content).toMatch(/SLA/);
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
  it("cloud-architect AGENTS.md mentions IaC / Terraform", () => {
    const content = readFile("agents/cloud-architect/AGENTS.md");
    expect(content).toMatch(/[Tt]erraform|[Oo]pen[Tt]ofu|IaC/);
  });

  it("cloud-architect AGENTS.md mentions security scanning (checkov or tfsec)", () => {
    const content = readFile("agents/cloud-architect/AGENTS.md");
    expect(content).toMatch(/checkov|tfsec/);
  });

  it("devops-engineer AGENTS.md mentions zero-touch deployment policy", () => {
    const content = readFile("agents/devops-engineer/AGENTS.md");
    expect(content).toMatch(/[Zz]ero.touch|zero-touch/);
  });

  it("devops-engineer AGENTS.md mentions automated rollback", () => {
    const content = readFile("agents/devops-engineer/AGENTS.md");
    expect(content).toMatch(/rollback/);
  });

  it("sre AGENTS.md mentions 99.9% SLA", () => {
    const content = readFile("agents/sre/AGENTS.md");
    expect(content).toMatch(/99\.9%/);
  });

  it("sre AGENTS.md defines P1/P2/P3/P4 severity tiers", () => {
    const content = readFile("agents/sre/AGENTS.md");
    expect(content).toMatch(/P1/);
    expect(content).toMatch(/P2/);
    expect(content).toMatch(/P3/);
    expect(content).toMatch(/P4/);
  });

  it("finops-analyst AGENTS.md mentions 30% cost reduction", () => {
    const content = readFile("agents/finops-analyst/AGENTS.md");
    expect(content).toMatch(/30%/);
  });

  it("security-ops AGENTS.md mentions drift detection", () => {
    const content = readFile("agents/security-ops/AGENTS.md");
    expect(content).toMatch(/drift/);
  });

  it("security-ops AGENTS.md mentions compliance frameworks (CIS/SOC 2/NIST)", () => {
    const content = readFile("agents/security-ops/AGENTS.md");
    expect(content).toMatch(/CIS|SOC 2|NIST/);
  });

  it("program-manager AGENTS.md mentions SLA tracking", () => {
    const content = readFile("agents/program-manager/AGENTS.md");
    expect(content).toMatch(/SLA/);
  });
});
