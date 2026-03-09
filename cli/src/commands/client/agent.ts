import { Command } from "commander";
import type { Agent } from "@paperclipai/shared";
import { AGENT_ADAPTER_TYPES, AGENT_ROLES } from "@paperclipai/shared";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline/promises";
import {
  addCommonClientOptions,
  formatInlineRecord,
  handleCommandError,
  printOutput,
  resolveCommandContext,
  type BaseClientOptions,
} from "./common.js";

interface AgentListOptions extends BaseClientOptions {
  companyId?: string;
}

interface AgentLocalCliOptions extends BaseClientOptions {
  companyId?: string;
  keyName?: string;
  installSkills?: boolean;
}

interface CreatedAgentKey {
  id: string;
  name: string;
  token: string;
  createdAt: string;
}

interface SkillsInstallSummary {
  tool: "codex" | "claude";
  target: string;
  linked: string[];
  skipped: string[];
  failed: Array<{ name: string; error: string }>;
}

const __moduleDir = path.dirname(fileURLToPath(import.meta.url));
const PAPERCLIP_SKILLS_CANDIDATES = [
  path.resolve(__moduleDir, "../../../../../skills"), // dev: cli/src/commands/client -> repo root/skills
  path.resolve(process.cwd(), "skills"),
];

function codexSkillsHome(): string {
  const fromEnv = process.env.CODEX_HOME?.trim();
  const base =
    fromEnv && fromEnv.length > 0 ? fromEnv : path.join(os.homedir(), ".codex");
  return path.join(base, "skills");
}

function claudeSkillsHome(): string {
  const fromEnv = process.env.CLAUDE_HOME?.trim();
  const base =
    fromEnv && fromEnv.length > 0
      ? fromEnv
      : path.join(os.homedir(), ".claude");
  return path.join(base, "skills");
}

async function resolvePaperclipSkillsDir(): Promise<string | null> {
  for (const candidate of PAPERCLIP_SKILLS_CANDIDATES) {
    const isDir = await fs
      .stat(candidate)
      .then((s) => s.isDirectory())
      .catch(() => false);
    if (isDir) return candidate;
  }
  return null;
}

async function installSkillsForTarget(
  sourceSkillsDir: string,
  targetSkillsDir: string,
  tool: "codex" | "claude"
): Promise<SkillsInstallSummary> {
  const summary: SkillsInstallSummary = {
    tool,
    target: targetSkillsDir,
    linked: [],
    skipped: [],
    failed: [],
  };

  await fs.mkdir(targetSkillsDir, { recursive: true });
  const entries = await fs.readdir(sourceSkillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const source = path.join(sourceSkillsDir, entry.name);
    const target = path.join(targetSkillsDir, entry.name);
    const existing = await fs.lstat(target).catch(() => null);
    if (existing) {
      summary.skipped.push(entry.name);
      continue;
    }

    try {
      await fs.symlink(source, target);
      summary.linked.push(entry.name);
    } catch (err) {
      summary.failed.push({
        name: entry.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return summary;
}

function buildAgentEnvExports(input: {
  apiBase: string;
  companyId: string;
  agentId: string;
  apiKey: string;
}): string {
  const escaped = (value: string) => value.replace(/'/g, "'\"'\"'");
  return [
    `export PAPERCLIP_API_URL='${escaped(input.apiBase)}'`,
    `export PAPERCLIP_COMPANY_ID='${escaped(input.companyId)}'`,
    `export PAPERCLIP_AGENT_ID='${escaped(input.agentId)}'`,
    `export PAPERCLIP_API_KEY='${escaped(input.apiKey)}'`,
  ].join("\n");
}

export function registerAgentCommands(program: Command): void {
  const agent = program.command("agent").description("Agent operations");

  addCommonClientOptions(
    agent
      .command("list")
      .description("List agents for a company")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .action(async (opts: AgentListOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const rows =
            (await ctx.api.get<Agent[]>(
              `/api/companies/${ctx.companyId}/agents`
            )) ?? [];

          if (ctx.json) {
            printOutput(rows, { json: true });
            return;
          }

          if (rows.length === 0) {
            printOutput([], { json: false });
            return;
          }

          for (const row of rows) {
            console.log(
              formatInlineRecord({
                id: row.id,
                name: row.name,
                role: row.role,
                status: row.status,
                reportsTo: row.reportsTo,
                budgetMonthlyCents: row.budgetMonthlyCents,
                spentMonthlyCents: row.spentMonthlyCents,
              })
            );
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false }
  );

  addCommonClientOptions(
    agent
      .command("get")
      .description("Get one agent")
      .argument("<agentId>", "Agent ID")
      .action(async (agentId: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const row = await ctx.api.get<Agent>(`/api/agents/${agentId}`);
          printOutput(row, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      })
  );

  addCommonClientOptions(
    agent
      .command("local-cli")
      .description(
        "Create an agent API key, install local Paperclip skills for Codex/Claude, and print shell exports"
      )
      .argument("<agentRef>", "Agent ID or shortname/url-key")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .option("--key-name <name>", "API key label", "local-cli")
      .option(
        "--no-install-skills",
        "Skip installing Paperclip skills into ~/.codex/skills and ~/.claude/skills"
      )
      .action(async (agentRef: string, opts: AgentLocalCliOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const query = new URLSearchParams({ companyId: ctx.companyId ?? "" });
          const agentRow = await ctx.api.get<Agent>(
            `/api/agents/${encodeURIComponent(agentRef)}?${query.toString()}`
          );
          if (!agentRow) {
            throw new Error(`Agent not found: ${agentRef}`);
          }

          const now = new Date().toISOString().replaceAll(":", "-");
          const keyName = opts.keyName?.trim()
            ? opts.keyName.trim()
            : `local-cli-${now}`;
          const key = await ctx.api.post<CreatedAgentKey>(
            `/api/agents/${agentRow.id}/keys`,
            { name: keyName }
          );
          if (!key) {
            throw new Error("Failed to create API key");
          }

          const installSummaries: SkillsInstallSummary[] = [];
          if (opts.installSkills !== false) {
            const skillsDir = await resolvePaperclipSkillsDir();
            if (!skillsDir) {
              throw new Error(
                "Could not locate local Paperclip skills directory. Expected ./skills in the repo checkout."
              );
            }

            installSummaries.push(
              await installSkillsForTarget(
                skillsDir,
                codexSkillsHome(),
                "codex"
              ),
              await installSkillsForTarget(
                skillsDir,
                claudeSkillsHome(),
                "claude"
              )
            );
          }

          const exportsText = buildAgentEnvExports({
            apiBase: ctx.api.apiBase,
            companyId: agentRow.companyId,
            agentId: agentRow.id,
            apiKey: key.token,
          });

          if (ctx.json) {
            printOutput(
              {
                agent: {
                  id: agentRow.id,
                  name: agentRow.name,
                  urlKey: agentRow.urlKey,
                  companyId: agentRow.companyId,
                },
                key: {
                  id: key.id,
                  name: key.name,
                  createdAt: key.createdAt,
                  token: key.token,
                },
                skills: installSummaries,
                exports: exportsText,
              },
              { json: true }
            );
            return;
          }

          console.log(`Agent: ${agentRow.name} (${agentRow.id})`);
          console.log(`API key created: ${key.name} (${key.id})`);
          if (installSummaries.length > 0) {
            for (const summary of installSummaries) {
              console.log(
                `${summary.tool}: linked=${summary.linked.length} skipped=${summary.skipped.length} failed=${summary.failed.length} target=${summary.target}`
              );
              for (const failed of summary.failed) {
                console.log(`  failed ${failed.name}: ${failed.error}`);
              }
            }
          }
          console.log("");
          console.log(
            "# Run this in your shell before launching codex/claude:"
          );
          console.log(exportsText);
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false }
  );

  // ── agent create ────────────────────────────────────────────────────────────

  interface AgentCreateOptions extends BaseClientOptions {
    companyId?: string;
    role?: string;
    title?: string;
    reportsTo?: string;
    adapterType?: string;
    adapterConfig?: string;
    runtimeConfig?: string;
    budget?: string;
  }

  addCommonClientOptions(
    agent
      .command("create")
      .description("Create a new agent")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .requiredOption("--name <name>", "Agent name")
      .option(
        "--adapter-type <type>",
        `Adapter type (${AGENT_ADAPTER_TYPES.join(", ")})`,
        "process"
      )
      .option(
        "--role <role>",
        `Agent role (${AGENT_ROLES.join(", ")})`,
        "general"
      )
      .option("--title <title>", "Agent job title")
      .option("--reports-to <agentId>", "UUID of the manager agent")
      .option(
        "--adapter-config <json>",
        "Adapter config as JSON string or @path/to/file.json"
      )
      .option("--runtime-config <json>", "Runtime config as JSON string")
      .option(
        "--budget <cents>",
        "Monthly budget in cents (0 = unlimited)",
        "0"
      )
      .action(async (opts: AgentCreateOptions & { name: string }) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });

          const adapterConfig = await parseJsonOpt(opts.adapterConfig);
          const runtimeConfig = await parseJsonOpt(opts.runtimeConfig);

          const body = {
            name: opts.name,
            role: opts.role ?? "general",
            title: opts.title ?? null,
            reportsTo: opts.reportsTo ?? null,
            adapterType: opts.adapterType ?? "process",
            adapterConfig: adapterConfig ?? {},
            runtimeConfig: runtimeConfig ?? {},
            budgetMonthlyCents: Number(opts.budget ?? 0),
          };

          const created = await ctx.api.post<Agent>(
            `/api/companies/${ctx.companyId}/agents`,
            body
          );

          if (ctx.json) {
            printOutput(created, { json: true });
            return;
          }

          if (created) {
            console.log(
              formatInlineRecord({
                id: created.id,
                name: created.name,
                role: created.role,
                status: created.status,
                adapterType: created.adapterType,
              })
            );
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false }
  );

  // ── agent update ────────────────────────────────────────────────────────────

  interface AgentUpdateOptions extends BaseClientOptions {
    name?: string;
    role?: string;
    title?: string;
    status?: string;
    reportsTo?: string;
    adapterType?: string;
    adapterConfig?: string;
    runtimeConfig?: string;
    budget?: string;
  }

  addCommonClientOptions(
    agent
      .command("update")
      .description(
        "Update an existing agent (partial update — only passed fields change)"
      )
      .argument("<agentId>", "Agent ID")
      .option("--name <name>", "Agent name")
      .option("--role <role>", `Agent role (${AGENT_ROLES.join(", ")})`)
      .option("--title <title>", "Agent job title")
      .option(
        "--status <status>",
        "Agent status (active, paused, idle, error, terminated)"
      )
      .option("--reports-to <agentId>", "UUID of the manager agent")
      .option(
        "--adapter-type <type>",
        `Adapter type (${AGENT_ADAPTER_TYPES.join(", ")})`
      )
      .option(
        "--adapter-config <json>",
        "Adapter config as JSON string or @path/to/file.json"
      )
      .option("--runtime-config <json>", "Runtime config as JSON string")
      .option("--budget <cents>", "Monthly budget in cents")
      .action(async (agentId: string, opts: AgentUpdateOptions) => {
        try {
          const ctx = resolveCommandContext(opts);

          const adapterConfig = await parseJsonOpt(opts.adapterConfig);
          const runtimeConfig = await parseJsonOpt(opts.runtimeConfig);

          const body: Record<string, unknown> = {};
          if (opts.name !== undefined) body.name = opts.name;
          if (opts.role !== undefined) body.role = opts.role;
          if (opts.title !== undefined) body.title = opts.title;
          if (opts.status !== undefined) body.status = opts.status;
          if (opts.reportsTo !== undefined) body.reportsTo = opts.reportsTo;
          if (opts.adapterType !== undefined)
            body.adapterType = opts.adapterType;
          if (adapterConfig !== null) body.adapterConfig = adapterConfig;
          if (runtimeConfig !== null) body.runtimeConfig = runtimeConfig;
          if (opts.budget !== undefined)
            body.budgetMonthlyCents = Number(opts.budget);

          if (Object.keys(body).length === 0) {
            throw new Error(
              "No fields to update. Pass at least one option such as --name or --status."
            );
          }

          const updated = await ctx.api.patch<Agent>(
            `/api/agents/${agentId}`,
            body
          );

          if (ctx.json) {
            printOutput(updated, { json: true });
            return;
          }

          if (updated) {
            console.log(
              formatInlineRecord({
                id: updated.id,
                name: updated.name,
                role: updated.role,
                status: updated.status,
                adapterType: updated.adapterType,
              })
            );
          }
        } catch (err) {
          handleCommandError(err);
        }
      })
  );

  // ── agent delete ────────────────────────────────────────────────────────────

  interface AgentDeleteOptions extends BaseClientOptions {
    yes?: boolean;
  }

  addCommonClientOptions(
    agent
      .command("delete")
      .description("Delete an agent (irreversible)")
      .argument("<agentId>", "Agent ID")
      .option("-y, --yes", "Skip confirmation prompt")
      .action(async (agentId: string, opts: AgentDeleteOptions) => {
        try {
          const ctx = resolveCommandContext(opts);

          if (!opts.yes) {
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout,
            });
            const answer = await rl.question(
              `Delete agent ${agentId}? This cannot be undone. Type "yes" to confirm: `
            );
            rl.close();
            if (answer.trim().toLowerCase() !== "yes") {
              console.log("Aborted.");
              process.exit(0);
            }
          }

          await ctx.api.delete(`/api/agents/${agentId}`);

          if (ctx.json) {
            printOutput({ ok: true, id: agentId }, { json: true });
            return;
          }

          console.log(`Deleted agent ${agentId}`);
        } catch (err) {
          handleCommandError(err);
        }
      })
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a JSON option value. Supports:
 *   - undefined / empty → returns null (field omitted from request)
 *   - "@path/to/file.json" → reads file and parses JSON
 *   - inline JSON string → parses directly
 */
async function parseJsonOpt(
  value: string | undefined
): Promise<Record<string, unknown> | null> {
  if (value === undefined || value.trim() === "") return null;

  let raw: string;
  if (value.startsWith("@")) {
    const filePath = value.slice(1);
    raw = await fs.readFile(filePath, "utf8");
  } else {
    raw = value;
  }

  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error("Value must be a JSON object");
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JSON: ${msg}`);
  }
}
