// @ts-nocheck
import { eq } from "drizzle-orm";
import { agents, issues, revenueEvents } from "@paperclipai/db";
import { telegramNotifierService } from "./telegram-notifier.js";
function formatCurrency(cents) {
  return `$${(cents / 100).toLocaleString()}`;
}
function telegramBriefService(db) {
  const notifier = telegramNotifierService(db);
  function briefTitle(type) {
    if (type === "weekly") return "Weekly Brief";
    if (type === "monthly") return "Monthly Brief";
    return "Daily Brief";
  }
  async function generateBrief(companyId, type = "daily") {
    const allAgents = await db.query.agents.findMany({
      where: eq(agents.companyId, companyId)
    });
    const activeAgents = allAgents.filter((a) => a.status === "active");
    const allIssues = await db.query.issues.findMany({
      where: eq(issues.companyId, companyId)
    });
    const openIssues = allIssues.filter((i) => i.status !== "done" && i.status !== "cancelled");
    const revenue = await db.query.revenueEvents.findMany({
      where: eq(revenueEvents.companyId, companyId),
      limit: 30
    });
    const mrr = revenue.reduce((acc, e) => {
      if (e.eventType === "subscription_created" || e.eventType === "subscription_renewed") {
        return acc + e.amountCents;
      }
      if (e.eventType === "subscription_cancelled") {
        return acc - Math.abs(e.amountCents);
      }
      return acc;
    }, 0);
    const sections = [];
    sections.push(`\u{1F4CA} *${briefTitle(type)}*`);
    sections.push(`_${(/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}_`);
    sections.push("");
    sections.push(`*\u{1F4C8} KPI Summary*`);
    if (mrr > 0) {
      sections.push(`\u2022 MRR: ${formatCurrency(mrr)}`);
    }
    sections.push(`\u2022 Active Agents: ${activeAgents.length}`);
    sections.push(`\u2022 Open Issues: ${openIssues.length}`);
    sections.push("");
    if (activeAgents.length > 0) {
      sections.push(`*\u{1F916} Agent Status*`);
      for (const agent of activeAgents.slice(0, 5)) {
        sections.push(`\u2022 ${agent.name}: ${agent.status}`);
      }
      if (activeAgents.length > 5) {
        sections.push(`\u2022 _+${activeAgents.length - 5} more_`);
      }
      sections.push("");
    }
    const highPriorityIssues = openIssues.filter((i) => i.priority === "high" || i.priority === "urgent");
    if (highPriorityIssues.length > 0) {
      sections.push(`*\u{1F3AF} Today's Priorities*`);
      for (const issue of highPriorityIssues.slice(0, 3)) {
        sections.push(`\u2022 ${issue.identifier}: ${issue.title}`);
      }
      sections.push("");
    }
    const inProgressIssues = openIssues.filter((i) => i.status === "in_progress");
    const blockedIssues = openIssues.filter((i) => i.status === "blocked");
    if (inProgressIssues.length > 0 || blockedIssues.length > 0) {
      sections.push(`*\u26A0\uFE0F Items Needing Attention*`);
      if (blockedIssues.length > 0) {
        sections.push(`\u2022 ${blockedIssues.length} blocked issue${blockedIssues.length > 1 ? "s" : ""}`);
      }
      if (inProgressIssues.length > 5) {
        sections.push(`\u2022 ${inProgressIssues.length} issues in progress`);
      }
      sections.push("");
    }
    sections.push(`---`);
    sections.push(`_Powered by Paperclip_`);
    return sections.join("\n");
  }
  async function sendTelegramBrief(companyId, brief, type = "daily") {
    try {
      const notification = await notifier.send(companyId, {
        channel: "telegram",
        type: type === "weekly" ? "weekly_pnl" : "daily_brief",
        subject: briefTitle(type),
        body: brief
      });
      if (notification.status !== "sent") {
        return { success: false, error: notification.error ?? "Failed to send brief", notificationId: notification.id };
      }
      return { success: true, notificationId: notification.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to send brief"
      };
    }
  }
  return {
    generateBrief,
    generateDailyBrief: async (companyId) => {
      return generateBrief(companyId, "daily");
    },
    sendTelegramBrief,
    sendTestBrief: async (companyId, type = "daily") => {
      try {
        const brief = await generateBrief(companyId, type);
        const result = await sendTelegramBrief(companyId, brief, type);
        if (result.success) {
          return { success: true, brief, notificationId: result.notificationId };
        }
        return { success: false, error: result.error, brief, notificationId: result.notificationId };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to generate brief"
        };
      }
    }
  };
}
export {
  telegramBriefService
};
