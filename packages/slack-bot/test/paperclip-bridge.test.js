import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  detectTaskRequest,
  extractProjectSelectors,
  fingerprintIssueComment,
  formatChildIssueParentNotice,
  formatChildIssueThreadRootMessage,
  hasPaperclipTrigger,
  resolveAssignee,
  resolveProject,
  stripBotMention,
} from "../src/paperclip-bridge.js";
import { PaperclipThreadStore } from "../src/paperclip-thread-store.js";

test("detectTaskRequest accepts bot mention before task prefix", () => {
  const task = detectTaskRequest({
    text: "<@U123> task: Fix the failing deploy\nMore detail here",
    taskPrefix: "task:",
  });

  assert.ok(task);
  assert.equal(task.title, "Fix the failing deploy");
  assert.equal(task.body, "Fix the failing deploy\nMore detail here");
});

test("detectTaskRequest accepts configured trigger mention before task prefix", () => {
  const task = detectTaskRequest({
    text: "@paperclip task: Fix the failing deploy\nMore detail here",
    taskPrefix: "task:",
    triggerMentions: ["@paperclip"],
  });

  assert.ok(task);
  assert.equal(task.title, "Fix the failing deploy");
  assert.equal(task.body, "Fix the failing deploy\nMore detail here");
});

test("detectTaskRequest accepts a title line before the trigger line", () => {
  const task = detectTaskRequest({
    text: "Eyalty - Verify email verification flow\n@paperclip task: Check the kill and restart flow\nInclude Business and Consumer variants",
    taskPrefix: "task:",
    triggerMentions: ["@paperclip"],
  });

  assert.ok(task);
  assert.equal(task.title, "Eyalty - Verify email verification flow");
  assert.equal(task.body, "Check the kill and restart flow\nInclude Business and Consumer variants");
});

test("hasPaperclipTrigger matches bot mention and configured aliases", () => {
  assert.equal(
    hasPaperclipTrigger({
      text: "<@BOT1> task: Fix the deploy",
      botUserId: "BOT1",
      triggerMentions: ["@paperclip"],
    }),
    true,
  );

  assert.equal(
    hasPaperclipTrigger({
      text: "task: Fix the deploy\n@paperclip please create this",
      botUserId: "BOT1",
      triggerMentions: ["@paperclip"],
    }),
    true,
  );

  assert.equal(
    hasPaperclipTrigger({
      text: "task: Fix the deploy",
      botUserId: "BOT1",
      triggerMentions: ["@paperclip"],
    }),
    false,
  );
});

test("resolveAssignee prefers configured Slack mapping", () => {
  const result = resolveAssignee({
    text: "task: <@U999> investigate this regression",
    agentMappings: {
      U999: "agent-2",
      "@alice": "agent-1",
    },
    agents: [
      { id: "agent-1", name: "Alice" },
      { id: "agent-2", name: "ReleaseCaptain" },
    ],
  });

  assert.equal(result.kind, "match");
  assert.equal(result.agent.id, "agent-2");
  assert.equal(result.source, "mapping");
});

test("resolveAssignee falls back to exact Paperclip agent name", () => {
  const result = resolveAssignee({
    text: "task: @BackendEngineer fix the webhook retry bug",
    agentMappings: {},
    agents: [
      { id: "agent-1", name: "BackendEngineer" },
      { id: "agent-2", name: "FrontendEngineer" },
    ],
  });

  assert.equal(result.kind, "match");
  assert.equal(result.agent.id, "agent-1");
  assert.equal(result.source, "agent_name");
});

test("extractProjectSelectors reads project metadata lines", () => {
  const selectors = extractProjectSelectors(
    "task: Fix onboarding\nproject: Eyalty App\n#project expense-tracker",
  );

  assert.deepEqual(selectors, ["Eyalty App", "expense-tracker"]);
});

test("extractProjectSelectors reads inline hashtag project selectors", () => {
  const selectors = extractProjectSelectors(
    "@paperclip task: Check email flow #project eyalty. @qa please verify.",
  );

  assert.deepEqual(selectors, ["eyalty"]);
});

test("resolveProject prefers configured project alias mapping", () => {
  const result = resolveProject({
    text: "task: Fix onboarding\nproject: eyalty",
    projectMappings: {
      eyalty: "project-2",
      expense: "project-1",
    },
    projects: [
      { id: "project-1", name: "AI-Auto-Expense-Tracker" },
      { id: "project-2", name: "Eyalty App" },
    ],
  });

  assert.equal(result.kind, "match");
  assert.equal(result.project.id, "project-2");
  assert.equal(result.source, "mapping");
});

test("resolveProject falls back to exact Paperclip project name", () => {
  const result = resolveProject({
    text: "task: Fix onboarding\nproject: AI Auto Expense Tracker",
    projectMappings: {},
    projects: [
      { id: "project-1", name: "AI-Auto-Expense-Tracker" },
      { id: "project-2", name: "Eyalty App" },
    ],
  });

  assert.equal(result.kind, "match");
  assert.equal(result.project.id, "project-1");
  assert.equal(result.source, "project_name");
});

test("stripBotMention only removes the bot mention", () => {
  const result = stripBotMention("<@BOT1> please sync this for <@U123>", "BOT1");
  assert.equal(result, "please sync this for <@U123>");
});

test("stripBotMention removes configured paperclip aliases", () => {
  const result = stripBotMention("@paperclip please sync this for <@U123>", "BOT1", ["@paperclip"]);
  assert.equal(result, "please sync this for <@U123>");
});

test("formatChildIssueThreadRootMessage includes parent, assignee, and project context", () => {
  const message = formatChildIssueThreadRootMessage({
    childIdentifier: "AND-9",
    parentIdentifier: "AND-8",
    title: "Implement OTP/email verification gate on app restart",
    assigneeName: "CTO",
    projectName: "Eyalty App",
  });

  assert.equal(
    message,
    [
      "Created Paperclip issue AND-9 from AND-8.",
      "This thread will track AND-9.",
      "Title: Implement OTP/email verification gate on app restart",
      "Assignee: CTO",
      "Project: Eyalty App",
    ].join("\n"),
  );
});

test("formatChildIssueParentNotice explains that a new Slack thread was opened", () => {
  const message = formatChildIssueParentNotice({
    childIdentifier: "AND-9",
    parentIdentifier: "AND-8",
  });

  assert.equal(
    message,
    "Paperclip AND-9 was created from AND-8. I opened a new Slack thread for AND-9.",
  );
});

test("paperclip thread store persists mappings and fingerprints", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-thread-store-"));
  try {
    const store = new PaperclipThreadStore(tmpDir);
    store.ensureLoaded();

    store.putMapping({
      channelId: "C123",
      threadTs: "111.222",
      companyId: "company-1",
      issueId: "issue-1",
      issueIdentifier: "PAP-1",
      assigneeAgentId: "agent-1",
      assigneeName: "BackendEngineer",
    });

    const fingerprint = fingerprintIssueComment("Progress update from Slack");
    store.rememberSlackFingerprint("issue-1", fingerprint);

    assert.equal(store.getMapping("C123", "111.222")?.issueIdentifier, "PAP-1");
    assert.equal(store.getMappingByIssueId("issue-1")?.channelId, "C123");
    assert.equal(store.hasRecentSlackFingerprint("issue-1", fingerprint), true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
