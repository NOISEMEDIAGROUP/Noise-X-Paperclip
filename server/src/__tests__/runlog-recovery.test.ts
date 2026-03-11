import { describe, expect, it } from "vitest";
import {
  extractRecoverySnapshotFromNdjson,
  mergeRecoverySnapshots,
} from "../recovery/runlog-recovery.js";

type InnerEvent = {
  type: "item.completed";
  item: {
    id: string;
    type: "command_execution";
    command: string;
    aggregated_output: string;
    exit_code: number;
    status: "completed";
  };
};

function row(event: InnerEvent): string {
  return JSON.stringify({
    ts: "2026-03-10T21:45:41.513Z",
    stream: "stdout",
    chunk: `${JSON.stringify(event)}\n`,
  });
}

function completedCommand(id: string, command: string, aggregatedOutput: string): string {
  return row({
    type: "item.completed",
    item: {
      id,
      type: "command_execution",
      command,
      aggregated_output: aggregatedOutput,
      exit_code: 0,
      status: "completed",
    },
  });
}

describe("run-log recovery extraction", () => {
  it("extracts agents, issues, comments, approvals, and approval links from logged command outputs", () => {
    const ndjson = [
      completedCommand(
        "item_3",
        "/bin/zsh -lc 'curl -sS -H \"Authorization: Bearer $PAPERCLIP_API_KEY\" \"$PAPERCLIP_API_URL/api/agents/me\"'",
        JSON.stringify({
          id: "477f8547-db34-40b6-b2e3-ffd18455b3ec",
          companyId: "ed85f5a8-c65e-42f9-b27b-d4177747897e",
          name: "Founding Engineer",
          role: "engineer",
          title: "Founding Engineer",
          icon: "rocket",
          status: "running",
          reportsTo: "41ec21f4-a820-45be-8296-127555674525",
          capabilities:
            "Owns technical architecture, implementation quality, testing discipline, and delivery execution across the product.",
          adapterType: "codex_local",
          adapterConfig: {
            cwd: "/Users/paveldmitriev/Work/cashbot",
            model: "gpt-5.3-codex",
          },
          runtimeConfig: {
            heartbeat: {
              enabled: true,
              intervalSec: 300,
              wakeOnDemand: true,
              maxConcurrentRuns: 1,
            },
          },
          permissions: { canCreateAgents: true },
          createdAt: "2026-03-10T20:53:17.930Z",
          updatedAt: "2026-03-10T21:49:24.046Z",
          urlKey: "founding-engineer",
        }),
      ),
      completedCommand(
        "item_49",
        "/bin/zsh -lc 'set -euo pipefail\nISSUE_ID=\"acc16af7-0c17-44ca-a289-a727e4bcc6bb\"\nBASE=\"$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/agent-hires\"\n...'",
        JSON.stringify({
          agent: {
            id: "fe149ba9-7062-4169-a8b9-ef7571bddf53",
            companyId: "ed85f5a8-c65e-42f9-b27b-d4177747897e",
            name: "Product Manager",
            role: "pm",
            title: "Product Manager",
            icon: "target",
            status: "pending_approval",
            reportsTo: "477f8547-db34-40b6-b2e3-ffd18455b3ec",
            capabilities:
              "Owns backlog prioritization, scope decomposition, acceptance criteria quality, and execution cadence for personal-use CashBot roadmap.",
            adapterType: "codex_local",
            adapterConfig: {
              cwd: "/Users/paveldmitriev/Work/cashbot",
              model: "gpt-5.3-codex",
              dangerouslyBypassApprovalsAndSandbox: true,
            },
            runtimeConfig: {
              heartbeat: {
                enabled: true,
                intervalSec: 300,
                wakeOnDemand: true,
                maxConcurrentRuns: 1,
              },
            },
            permissions: { canCreateAgents: false },
            createdAt: "2026-03-10T21:45:41.513Z",
            updatedAt: "2026-03-10T21:45:41.513Z",
            urlKey: "product-manager",
          },
          approval: {
            id: "e85910ea-6746-4628-9873-b774c0e8a2bd",
            companyId: "ed85f5a8-c65e-42f9-b27b-d4177747897e",
            type: "hire_agent",
            requestedByAgentId: "477f8547-db34-40b6-b2e3-ffd18455b3ec",
            requestedByUserId: null,
            status: "pending",
            payload: {
              icon: "target",
              name: "Product Manager",
              role: "pm",
              title: "Product Manager",
              agentId: "fe149ba9-7062-4169-a8b9-ef7571bddf53",
              reportsTo: "477f8547-db34-40b6-b2e3-ffd18455b3ec",
            },
            decisionNote: null,
            decidedByUserId: null,
            decidedAt: null,
            createdAt: "2026-03-10T21:45:41.513Z",
            updatedAt: "2026-03-10T21:45:41.513Z",
          },
        }),
      ),
      completedCommand(
        "item_9",
        "/bin/zsh -lc 'set -euo pipefail\nISSUE_ID=\"acc16af7-0c17-44ca-a289-a727e4bcc6bb\"\ncurl -sS -H \"Authorization: Bearer $PAPERCLIP_API_KEY\" \"$PAPERCLIP_API_URL/api/issues/$ISSUE_ID\"'",
        JSON.stringify({
          id: "acc16af7-0c17-44ca-a289-a727e4bcc6bb",
          companyId: "ed85f5a8-c65e-42f9-b27b-d4177747897e",
          parentId: null,
          title: "Исследовать проект",
          description: "Составь план доработок, создай agents team для его реализации\n\n<plan>\nfull plan\n</plan>\n",
          status: "in_progress",
          priority: "high",
          assigneeAgentId: "477f8547-db34-40b6-b2e3-ffd18455b3ec",
          createdByUserId: "local-board",
          issueNumber: 2,
          identifier: "CAS-2",
          startedAt: "2026-03-10T21:48:16.895Z",
          createdAt: "2026-03-10T21:23:47.100Z",
          updatedAt: "2026-03-10T21:49:24.044Z",
          ancestors: [],
          project: null,
          goal: null,
        }),
      ),
      completedCommand(
        "item_10",
        "/bin/zsh -lc 'set -euo pipefail\nISSUE_ID=\"acc16af7-0c17-44ca-a289-a727e4bcc6bb\"\ncurl -sS -H \"Authorization: Bearer $PAPERCLIP_API_KEY\" \"$PAPERCLIP_API_URL/api/issues/$ISSUE_ID/comments\"'",
        JSON.stringify([
          {
            id: "76e6fab2-ce62-42a7-a71c-f4ccb7b0fd6f",
            companyId: "ed85f5a8-c65e-42f9-b27b-d4177747897e",
            issueId: "acc16af7-0c17-44ca-a289-a727e4bcc6bb",
            authorAgentId: "477f8547-db34-40b6-b2e3-ffd18455b3ec",
            authorUserId: null,
            body:
              "## Update\n\nПлан доработок добавлен в описание задачи в блоке `<plan/>`, и создана команда агентов.",
            createdAt: "2026-03-10T21:47:01.413Z",
            updatedAt: "2026-03-10T21:47:01.413Z",
          },
          {
            id: "9bd7d78c-a87c-477a-aa21-bf36d6a7d30d",
            companyId: "ed85f5a8-c65e-42f9-b27b-d4177747897e",
            issueId: "acc16af7-0c17-44ca-a289-a727e4bcc6bb",
            authorAgentId: null,
            authorUserId: "local-board",
            body: "Выполни задачу полностью: план доработок + hires.",
            createdAt: "2026-03-10T21:42:45.097Z",
            updatedAt: "2026-03-10T21:42:45.097Z",
          },
        ]),
      ),
      completedCommand(
        "item_54",
        "/bin/zsh -lc 'curl -sS \"$PAPERCLIP_API_URL/api/issues/acc16af7-0c17-44ca-a289-a727e4bcc6bb/approvals\" -H \"Authorization: Bearer $PAPERCLIP_API_KEY\" | jq'",
        JSON.stringify([
          {
            id: "e85910ea-6746-4628-9873-b774c0e8a2bd",
            companyId: "ed85f5a8-c65e-42f9-b27b-d4177747897e",
            type: "hire_agent",
            requestedByAgentId: "477f8547-db34-40b6-b2e3-ffd18455b3ec",
            requestedByUserId: null,
            status: "pending",
            payload: {
              name: "Product Manager",
              role: "pm",
              agentId: "fe149ba9-7062-4169-a8b9-ef7571bddf53",
            },
            decisionNote: null,
            decidedByUserId: null,
            decidedAt: null,
            createdAt: "2026-03-10T21:45:41.513Z",
            updatedAt: "2026-03-10T21:45:41.513Z",
          },
          {
            id: "8bed5ce5-2f01-41a1-b44c-1a1b6e03c960",
            companyId: "ed85f5a8-c65e-42f9-b27b-d4177747897e",
            type: "hire_agent",
            requestedByAgentId: "477f8547-db34-40b6-b2e3-ffd18455b3ec",
            requestedByUserId: null,
            status: "pending",
            payload: {
              name: "QA Engineer",
              role: "engineer",
              agentId: "08e37e5a-9ec3-4155-a24e-c984706e30c4",
            },
            decisionNote: null,
            decidedByUserId: null,
            decidedAt: null,
            createdAt: "2026-03-10T21:45:29.933Z",
            updatedAt: "2026-03-10T21:45:29.933Z",
          },
          {
            id: "0efae2be-72b0-4e26-af2a-16e02d0504ce",
            companyId: "ed85f5a8-c65e-42f9-b27b-d4177747897e",
            type: "hire_agent",
            requestedByAgentId: "477f8547-db34-40b6-b2e3-ffd18455b3ec",
            requestedByUserId: null,
            status: "pending",
            payload: {
              name: "Backend Engineer",
              role: "engineer",
              agentId: "5fec9748-57a7-47e3-a66a-c8d2948241ea",
            },
            decisionNote: null,
            decidedByUserId: null,
            decidedAt: null,
            createdAt: "2026-03-10T21:45:29.912Z",
            updatedAt: "2026-03-10T21:45:29.912Z",
          },
        ]),
      ),
      completedCommand(
        "item_40",
        "/bin/zsh -lc 'set -euo pipefail\nfor id in 5468d757-9c8f-4d05-b18e-e028bcda806a afe8bd53-b2c3-47cd-9c91-0cb2e14fe430 9e21c72d-8d0f-4dc7-8d3b-0c696fc1be35; do\n  curl -sS -H \"Authorization: Bearer $PAPERCLIP_API_KEY\" \"$PAPERCLIP_API_URL/api/issues/$id\" | jq -c \".\"\ndone'",
        [
          JSON.stringify({
            id: "5468d757-9c8f-4d05-b18e-e028bcda806a",
            identifier: "CAS-3",
            companyId: "ed85f5a8-c65e-42f9-b27b-d4177747897e",
            title: "Phase 2: Core execution hardening (EMS/RM)",
            status: "blocked",
            assigneeAgentId: "5fec9748-57a7-47e3-a66a-c8d2948241ea",
            parentId: "acc16af7-0c17-44ca-a289-a727e4bcc6bb",
            createdAt: "2026-03-10T21:51:23.616Z",
          }),
          JSON.stringify({
            id: "afe8bd53-b2c3-47cd-9c91-0cb2e14fe430",
            identifier: "CAS-4",
            companyId: "ed85f5a8-c65e-42f9-b27b-d4177747897e",
            title: "Phase 3: Verification system & quality gates",
            status: "todo",
            assigneeAgentId: "08e37e5a-9ec3-4155-a24e-c984706e30c4",
            parentId: "acc16af7-0c17-44ca-a289-a727e4bcc6bb",
            createdAt: "2026-03-10T21:51:23.616Z",
          }),
        ].join("\n"),
      ),
    ].join("\n");

    const snapshot = extractRecoverySnapshotFromNdjson(ndjson, {
      companyId: "ed85f5a8-c65e-42f9-b27b-d4177747897e",
      agentId: "477f8547-db34-40b6-b2e3-ffd18455b3ec",
      runId: "ebe642e5-94cd-40a3-8cf9-b4db1deca0c7",
      filePath:
        "/Users/paveldmitriev/.paperclip/instances/default/data/run-logs/ed85f5a8-c65e-42f9-b27b-d4177747897e/477f8547-db34-40b6-b2e3-ffd18455b3ec/ebe642e5-94cd-40a3-8cf9-b4db1deca0c7.ndjson",
    });

    expect(snapshot.agents.map((agent) => agent.name).sort()).toEqual([
      "Founding Engineer",
      "Product Manager",
    ]);
    expect(snapshot.issues.map((issue) => issue.identifier).sort()).toEqual(["CAS-2", "CAS-3", "CAS-4"]);
    expect(snapshot.issueComments.map((comment) => comment.id).sort()).toEqual([
      "76e6fab2-ce62-42a7-a71c-f4ccb7b0fd6f",
      "9bd7d78c-a87c-477a-aa21-bf36d6a7d30d",
    ]);
    expect(snapshot.approvals.map((approval) => approval.id).sort()).toEqual([
      "0efae2be-72b0-4e26-af2a-16e02d0504ce",
      "8bed5ce5-2f01-41a1-b44c-1a1b6e03c960",
      "e85910ea-6746-4628-9873-b774c0e8a2bd",
    ]);
    expect(snapshot.issueApprovals).toEqual([
      {
        companyId: "ed85f5a8-c65e-42f9-b27b-d4177747897e",
        issueId: "acc16af7-0c17-44ca-a289-a727e4bcc6bb",
        approvalId: "0efae2be-72b0-4e26-af2a-16e02d0504ce",
        linkedByAgentId: "477f8547-db34-40b6-b2e3-ffd18455b3ec",
        linkedByUserId: null,
        createdAt: "2026-03-10T21:45:41.513Z",
      },
      {
        companyId: "ed85f5a8-c65e-42f9-b27b-d4177747897e",
        issueId: "acc16af7-0c17-44ca-a289-a727e4bcc6bb",
        approvalId: "8bed5ce5-2f01-41a1-b44c-1a1b6e03c960",
        linkedByAgentId: "477f8547-db34-40b6-b2e3-ffd18455b3ec",
        linkedByUserId: null,
        createdAt: "2026-03-10T21:45:41.513Z",
      },
      {
        companyId: "ed85f5a8-c65e-42f9-b27b-d4177747897e",
        issueId: "acc16af7-0c17-44ca-a289-a727e4bcc6bb",
        approvalId: "e85910ea-6746-4628-9873-b774c0e8a2bd",
        linkedByAgentId: "477f8547-db34-40b6-b2e3-ffd18455b3ec",
        linkedByUserId: null,
        createdAt: "2026-03-10T21:45:41.513Z",
      },
    ]);
  });

  it("merges duplicate issue payloads by taking newer explicit fields without losing richer text", () => {
    const olderSnapshot = extractRecoverySnapshotFromNdjson(
      completedCommand(
        "item_9",
        "/bin/zsh -lc 'curl -sS \"$PAPERCLIP_API_URL/api/issues/acc16af7-0c17-44ca-a289-a727e4bcc6bb\"'",
        JSON.stringify({
          id: "acc16af7-0c17-44ca-a289-a727e4bcc6bb",
          companyId: "ed85f5a8-c65e-42f9-b27b-d4177747897e",
          title: "Исследовать проект",
          description: "Long plan body",
          status: "in_progress",
          priority: "high",
          assigneeAgentId: "477f8547-db34-40b6-b2e3-ffd18455b3ec",
          identifier: "CAS-2",
          createdAt: "2026-03-10T21:23:47.100Z",
          updatedAt: "2026-03-10T21:50:09.334Z",
        }),
      ),
      {
        companyId: "ed85f5a8-c65e-42f9-b27b-d4177747897e",
        agentId: "477f8547-db34-40b6-b2e3-ffd18455b3ec",
        runId: "424f02b2-f958-47c9-9ad4-0ee5c04a5b10",
        filePath: "/tmp/older.ndjson",
      },
    );

    const newerSnapshot = extractRecoverySnapshotFromNdjson(
      completedCommand(
        "item_39",
        "/bin/zsh -lc 'curl -sS \"$PAPERCLIP_API_URL/api/issues/$ISSUE_ID\" | jq -c \".\"'",
        JSON.stringify({
          id: "acc16af7-0c17-44ca-a289-a727e4bcc6bb",
          identifier: "CAS-2",
          status: "done",
          assigneeAgentId: "477f8547-db34-40b6-b2e3-ffd18455b3ec",
          checkoutRunId: null,
          executionRunId: "eee0f681-95f9-4c1c-ba50-1dab59c7f1f4",
          executionLockedAt: "2026-03-10T21:51:27.462Z",
          updatedAt: "2026-03-10T21:52:49.416Z",
        }),
      ),
      {
        companyId: "ed85f5a8-c65e-42f9-b27b-d4177747897e",
        agentId: "477f8547-db34-40b6-b2e3-ffd18455b3ec",
        runId: "424f02b2-f958-47c9-9ad4-0ee5c04a5b10",
        filePath: "/tmp/newer.ndjson",
      },
    );

    const merged = mergeRecoverySnapshots([olderSnapshot, newerSnapshot]);
    expect(merged.issues).toHaveLength(1);
    expect(merged.issues[0]).toMatchObject({
      id: "acc16af7-0c17-44ca-a289-a727e4bcc6bb",
      identifier: "CAS-2",
      status: "done",
      executionRunId: "eee0f681-95f9-4c1c-ba50-1dab59c7f1f4",
      description: "Long plan body",
    });
  });

  it("extracts issue comments from patch commands when the response only exposes commentId", () => {
    const ndjson = completedCommand(
      "item_65",
      "/bin/zsh -lc \"cat > /tmp/cas2_status_comment.md <<'EOF'\n## Update\n\nПлан доработок добавлен в описание задачи.\n\n### Blocker\n- Статус: `blocked`\nEOF\n\njq -Rs '{status:\\\"blocked\\\", comment:.}' < /tmp/cas2_status_comment.md > /tmp/cas2_status_patch.json\n\ncurl -sS -X PATCH \\\"$PAPERCLIP_API_URL/api/issues/acc16af7-0c17-44ca-a289-a727e4bcc6bb\\\" \\\n  -H \\\"Authorization: Bearer $PAPERCLIP_API_KEY\\\" \\\n  -H \\\"Content-Type: application/json\\\" \\\n  -H \\\"X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID\\\" \\\n  --data-binary @/tmp/cas2_status_patch.json | jq '{identifier,status,updatedAt,commentId:(.comment.id // null)}'\"",
      JSON.stringify({
        identifier: "CAS-2",
        status: "blocked",
        updatedAt: "2026-03-10T21:47:01.411Z",
        commentId: "76e6fab2-ce62-42a7-a71c-f4ccb7b0fd6f",
      }),
    );

    const snapshot = extractRecoverySnapshotFromNdjson(ndjson, {
      companyId: "ed85f5a8-c65e-42f9-b27b-d4177747897e",
      agentId: "477f8547-db34-40b6-b2e3-ffd18455b3ec",
      runId: "ebe642e5-94cd-40a3-8cf9-b4db1deca0c7",
      filePath: "/tmp/comment-from-patch.ndjson",
    });

    expect(snapshot.issueComments).toContainEqual(
      expect.objectContaining({
        id: "76e6fab2-ce62-42a7-a71c-f4ccb7b0fd6f",
        issueId: "acc16af7-0c17-44ca-a289-a727e4bcc6bb",
        authorAgentId: "477f8547-db34-40b6-b2e3-ffd18455b3ec",
        body: "## Update\n\nПлан доработок добавлен в описание задачи.\n\n### Blocker\n- Статус: `blocked`",
      }),
    );
  });
});
