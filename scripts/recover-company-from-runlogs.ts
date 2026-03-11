import {
  agents,
  approvals,
  companies,
  createDb,
  goals,
  heartbeatRuns,
  issueApprovals,
  issueComments,
  issues,
  projects,
} from "../packages/db/src/index.ts";
import type { PgTableWithColumns } from "drizzle-orm/pg-core";
import {
  extractRecoverySnapshotFromLogRoot,
  type RecoverySnapshot,
} from "../server/src/recovery/runlog-recovery.ts";

type Args = {
  logRoot: string;
  companyId: string;
  databaseUrl: string | null;
  apply: boolean;
};

function parseArgs(argv: string[]): Args {
  const values = new Map<string, string>();
  let apply = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") {
      apply = true;
      continue;
    }
    if (arg === "--dry-run") {
      apply = false;
      continue;
    }
    if (!arg.startsWith("--")) continue;
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }
    values.set(arg, next);
    index += 1;
  }

  const logRoot = values.get("--log-root");
  const companyId = values.get("--company-id");
  const databaseUrl = values.get("--database-url") ?? process.env.DATABASE_URL;

  if (!logRoot) throw new Error("--log-root is required");
  if (!companyId) throw new Error("--company-id is required");
  if (apply && !databaseUrl) throw new Error("--database-url or DATABASE_URL is required when using --apply");

  return { logRoot, companyId, databaseUrl: databaseUrl ?? null, apply };
}

function snapshotSummary(snapshot: RecoverySnapshot) {
  return {
    company: snapshot.company?.id ?? null,
    agents: snapshot.agents.length,
    goals: snapshot.goals.length,
    projects: snapshot.projects.length,
    issues: snapshot.issues.length,
    issueComments: snapshot.issueComments.length,
    approvals: snapshot.approvals.length,
    issueApprovals: snapshot.issueApprovals.length,
    heartbeatRuns: snapshot.heartbeatRuns.length,
  };
}

function stripUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as T;
}

function chunk<T>(values: T[], size = 100): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function upsertById<T extends { id: string }>(
  db: ReturnType<typeof createDb>,
  table: PgTableWithColumns<any>,
  rows: T[],
): Promise<void> {
  if (rows.length === 0) return;
  for (const batch of chunk(rows.map((row) => stripUndefined(row)))) {
    const set = Object.fromEntries(
      Object.keys(batch[0] ?? {})
        .filter((key) => key !== "id")
        .map((key) => [key, (table as Record<string, unknown>)[key]]),
    );
    await db
      .insert(table)
      .values(batch as any)
      .onConflictDoUpdate({
        target: (table as Record<string, unknown>).id as any,
        set: set as any,
      });
  }
}

async function upsertIssueApprovals(
  db: ReturnType<typeof createDb>,
  rows: RecoverySnapshot["issueApprovals"],
): Promise<void> {
  if (rows.length === 0) return;
  for (const batch of chunk(rows.map((row) => stripUndefined(row)))) {
    await db
      .insert(issueApprovals)
      .values(batch as any)
      .onConflictDoUpdate({
        target: [issueApprovals.issueId, issueApprovals.approvalId],
        set: {
          companyId: issueApprovals.companyId,
          linkedByAgentId: issueApprovals.linkedByAgentId,
          linkedByUserId: issueApprovals.linkedByUserId,
          createdAt: issueApprovals.createdAt,
        },
      });
  }
}

async function applySnapshot(databaseUrl: string, snapshot: RecoverySnapshot): Promise<void> {
  const db = createDb(databaseUrl);

  await db.transaction(async (tx) => {
    if (snapshot.company) {
      await upsertById(tx as ReturnType<typeof createDb>, companies, [snapshot.company]);
    }
    await upsertById(tx as ReturnType<typeof createDb>, agents, snapshot.agents);
    await upsertById(tx as ReturnType<typeof createDb>, goals, snapshot.goals);
    await upsertById(tx as ReturnType<typeof createDb>, projects, snapshot.projects);
    await upsertById(tx as ReturnType<typeof createDb>, heartbeatRuns, snapshot.heartbeatRuns);
    await upsertById(tx as ReturnType<typeof createDb>, issues, snapshot.issues);
    await upsertById(tx as ReturnType<typeof createDb>, issueComments, snapshot.issueComments);
    await upsertById(tx as ReturnType<typeof createDb>, approvals, snapshot.approvals);
    await upsertIssueApprovals(tx as ReturnType<typeof createDb>, snapshot.issueApprovals);
  });
}

const args = parseArgs(process.argv.slice(2));
const snapshot = await extractRecoverySnapshotFromLogRoot(args.logRoot, { companyId: args.companyId });

console.log(
  JSON.stringify(
    {
      mode: args.apply ? "apply" : "dry-run",
      logRoot: args.logRoot,
      companyId: args.companyId,
      summary: snapshotSummary(snapshot),
      company: snapshot.company,
    },
    null,
    2,
  ),
);

if (!args.apply) process.exit(0);

await applySnapshot(args.databaseUrl!, snapshot);

console.log(
  JSON.stringify(
    {
      mode: "applied",
      companyId: args.companyId,
      summary: snapshotSummary(snapshot),
    },
    null,
    2,
  ),
);
