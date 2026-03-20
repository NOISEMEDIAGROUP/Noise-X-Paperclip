import { and, eq, or, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, companies, issues } from "@paperclipai/db";
import { logger } from "../middleware/logger.js";

interface VerticalBudgetConfig {
  multiplier: number;
  reloadFraction: number;
}

interface VerticalBudgetSummary {
  vpAgentId: string;
  vpName: string;
  multiplier: number;
  sumIndividualBudgets: number;
  verticalTotal: number;
  sumSpent: number;
  remaining: number;
}

function getVerticalBudgetConfig(agent: { runtimeConfig: unknown }): VerticalBudgetConfig | null {
  const rc = agent.runtimeConfig;
  if (typeof rc !== "object" || rc === null || Array.isArray(rc)) return null;
  const vb = (rc as Record<string, unknown>).verticalBudget;
  if (typeof vb !== "object" || vb === null || Array.isArray(vb)) return null;
  const obj = vb as Record<string, unknown>;
  return {
    multiplier: typeof obj.multiplier === "number" ? obj.multiplier : 1.5,
    reloadFraction: typeof obj.reloadFraction === "number" ? obj.reloadFraction : 0.5,
  };
}

export function verticalBudgetService(db: Db) {

  async function getById(id: string) {
    return db
      .select()
      .from(agents)
      .where(eq(agents.id, id))
      .then((rows) => rows[0] ?? null);
  }

  async function getVerticalHead(agentId: string): Promise<typeof agents.$inferSelect | null> {
    const visited = new Set<string>();
    let currentId: string | null = agentId;

    while (currentId && !visited.has(currentId) && visited.size < 50) {
      visited.add(currentId);
      const agent = await getById(currentId);
      if (!agent) return null;

      // Check if this agent is a vertical head (has verticalBudget config or name starts with "VP ")
      if (getVerticalBudgetConfig(agent) || agent.name.startsWith("VP ")) {
        return agent;
      }

      currentId = agent.reportsTo ?? null;
    }
    return null;
  }

  async function getVerticalMembers(vpAgentId: string) {
    const members = await db
      .select()
      .from(agents)
      .where(eq(agents.reportsTo, vpAgentId));
    const vp = await getById(vpAgentId);
    if (vp) members.push(vp);
    return members;
  }

  async function computeVerticalBudget(vpAgentId: string): Promise<VerticalBudgetSummary | null> {
    const vp = await getById(vpAgentId);
    if (!vp) return null;

    const config = getVerticalBudgetConfig(vp);
    const multiplier = config?.multiplier ?? 1.5;

    const members = await getVerticalMembers(vpAgentId);

    const sumIndividualBudgets = members.reduce((sum, m) => sum + m.budgetMonthlyCents, 0);
    const sumSpent = members.reduce((sum, m) => sum + m.spentMonthlyCents, 0);
    const verticalTotal = Math.round(multiplier * sumIndividualBudgets);
    const remaining = verticalTotal - sumSpent;

    return {
      vpAgentId,
      vpName: vp.name,
      multiplier,
      sumIndividualBudgets,
      verticalTotal,
      sumSpent,
      remaining,
    };
  }

  async function findVpFinance(companyId: string) {
    // Try by name first
    const byName = await db
      .select()
      .from(agents)
      .where(and(eq(agents.companyId, companyId), eq(agents.name, "VP Finance")))
      .then((rows) => rows[0] ?? null);
    if (byName) return byName;

    // Fallback to role
    return db
      .select()
      .from(agents)
      .where(and(eq(agents.companyId, companyId), eq(agents.role, "cfo")))
      .then((rows) => rows[0] ?? null);
  }

  async function findHumanInChain(agentId: string): Promise<typeof agents.$inferSelect | null> {
    const visited = new Set<string>();
    let currentId: string | null = agentId;

    while (currentId && !visited.has(currentId) && visited.size < 50) {
      visited.add(currentId);
      const agent = await getById(currentId);
      if (!agent) return null;
      if (agent.adapterType === "human") return agent;
      currentId = agent.reportsTo ?? null;
    }
    return null;
  }

  async function createIssueWithCounter(
    companyId: string,
    data: { title: string; description: string; status: string; assigneeAgentId?: string | null; assigneeUserId?: string | null },
  ) {
    return db.transaction(async (tx) => {
      const [company] = await tx
        .update(companies)
        .set({ issueCounter: sql`${companies.issueCounter} + 1` })
        .where(eq(companies.id, companyId))
        .returning({ issueCounter: companies.issueCounter, issuePrefix: companies.issuePrefix });

      const issueNumber = company.issueCounter;
      const identifier = `${company.issuePrefix}-${issueNumber}`;

      const [issue] = await tx.insert(issues).values({
        companyId,
        issueNumber,
        identifier,
        title: data.title,
        description: data.description,
        status: data.status,
        assigneeAgentId: data.assigneeAgentId ?? null,
        assigneeUserId: data.assigneeUserId ?? null,
      }).returning();

      return issue;
    });
  }

  async function hasOpenReloadIssue(companyId: string, agentName: string): Promise<boolean> {
    const title = `Budget reload: ${agentName}`;
    const existing = await db
      .select({ id: issues.id })
      .from(issues)
      .where(
        and(
          eq(issues.companyId, companyId),
          eq(issues.title, title),
          or(
            eq(issues.status, "todo"),
            eq(issues.status, "in_progress"),
            eq(issues.status, "backlog"),
          ),
        ),
      )
      .then((rows) => rows.length > 0);
    return existing;
  }

  async function requestBudgetReload(exhaustedAgentId: string) {
    const agent = await getById(exhaustedAgentId);
    if (!agent) {
      logger.warn({ agentId: exhaustedAgentId }, "budget reload: agent not found");
      return;
    }

    // Deduplicate
    if (await hasOpenReloadIssue(agent.companyId, agent.name)) {
      logger.info({ agentId: exhaustedAgentId }, "budget reload: open issue already exists, skipping");
      return;
    }

    const vp = await getVerticalHead(exhaustedAgentId);
    if (!vp) {
      logger.warn({ agentId: exhaustedAgentId }, "budget reload: no VP found in chain, leaving paused");
      return;
    }

    const budget = await computeVerticalBudget(vp.id);
    if (!budget) {
      logger.warn({ agentId: exhaustedAgentId, vpId: vp.id }, "budget reload: could not compute vertical budget");
      return;
    }

    const config = getVerticalBudgetConfig(vp);
    const reloadFraction = config?.reloadFraction ?? 0.5;
    const reloadAmount = Math.round(reloadFraction * agent.budgetMonthlyCents);

    const vpFinance = await findVpFinance(agent.companyId);
    if (!vpFinance) {
      logger.warn({ companyId: agent.companyId }, "budget reload: VP Finance agent not found");
      return;
    }

    if (budget.remaining >= reloadAmount) {
      // Create issue for VP Finance to reload
      const newBudget = agent.budgetMonthlyCents + reloadAmount;
      const title = `Budget reload: ${agent.name}`;
      const description = [
        `Agent ${agent.name} (id: ${agent.id}) exhausted budget.`,
        `Original: $${(agent.budgetMonthlyCents / 100).toFixed(2)}, Spent: $${(agent.spentMonthlyCents / 100).toFixed(2)}`,
        `Vertical: ${vp.name}, Remaining: $${(budget.remaining / 100).toFixed(2)}`,
        `Reload requested: $${(reloadAmount / 100).toFixed(2)}`,
        ``,
        `ACTION: Call PATCH /api/agents/${agent.id}/budgets with budgetMonthlyCents=${newBudget}`,
        `        Then call PATCH /api/agents/${agent.id} with status="idle"`,
      ].join("\n");

      await createIssueWithCounter(agent.companyId, {
        title,
        description,
        status: "todo",
        assigneeAgentId: vpFinance.id,
      });

      logger.info(
        { agentId: exhaustedAgentId, vpFinanceId: vpFinance.id, reloadAmount },
        "budget reload: issue created for VP Finance",
      );
    } else {
      // Escalate to human
      const human = await findHumanInChain(exhaustedAgentId);
      const assignee = human ?? vpFinance;
      const title = `Budget reload: ${agent.name}`;
      const description = [
        `Agent ${agent.name} (id: ${agent.id}) exhausted budget.`,
        `Original: $${(agent.budgetMonthlyCents / 100).toFixed(2)}, Spent: $${(agent.spentMonthlyCents / 100).toFixed(2)}`,
        `Vertical: ${vp.name}, Remaining: $${(budget.remaining / 100).toFixed(2)}`,
        ``,
        `Vertical budget is insufficient for automatic reload ($${(reloadAmount / 100).toFixed(2)} needed).`,
        `Please review and manually increase the budget if appropriate.`,
      ].join("\n");

      await createIssueWithCounter(agent.companyId, {
        title,
        description,
        status: "todo",
        assigneeAgentId: human ? null : vpFinance.id,
        assigneeUserId: human ? human.id : null,
      });

      logger.info(
        { agentId: exhaustedAgentId, escalatedTo: assignee.name },
        "budget reload: escalated to human — vertical budget exhausted",
      );
    }
  }

  async function executeReload(agentId: string, additionalCents: number) {
    const agent = await getById(agentId);
    if (!agent) return null;

    const newBudget = agent.budgetMonthlyCents + additionalCents;
    await db
      .update(agents)
      .set({
        budgetMonthlyCents: newBudget,
        status: agent.status === "paused" ? "idle" : agent.status,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agentId));

    logger.info(
      { agentId, oldBudget: agent.budgetMonthlyCents, newBudget, additionalCents },
      "budget reload: executed",
    );

    return getById(agentId);
  }

  async function getAllVerticalBudgets(companyId: string): Promise<VerticalBudgetSummary[]> {
    // Find all VP agents in the company
    const vpAgents = await db
      .select()
      .from(agents)
      .where(eq(agents.companyId, companyId));

    const vps = vpAgents.filter(
      (a) => getVerticalBudgetConfig(a) !== null || (a.name.startsWith("VP ") && a.name !== "VP Finance"),
    );

    const summaries: VerticalBudgetSummary[] = [];
    for (const vp of vps) {
      const budget = await computeVerticalBudget(vp.id);
      if (budget) summaries.push(budget);
    }
    return summaries;
  }

  return {
    getVerticalHead,
    getVerticalMembers,
    computeVerticalBudget,
    findVpFinance,
    requestBudgetReload,
    executeReload,
    getAllVerticalBudgets,
  };
}
