/**
 * CLI `workflow` command — orquestração multi-agente via linha de comando.
 *
 * Permite criar e executar pipelines de tarefas encadeadas entre agentes,
 * usando a API do Paperclip diretamente.
 *
 * Exemplos:
 *   paperclipai workflow run \
 *     --step "agent-a:Pesquisar alternativas de autenticação" \
 *     --step "agent-b:Implementar solução escolhida" \
 *     --step "agent-c:Revisar implementação" \
 *     --goal-id <goalId> \
 *     --parent-id <parentId>
 *
 *   paperclipai workflow status --pipeline-id <issueId>
 */

import { Command } from "commander";
import pc from "picocolors";
import type { Issue } from "@paperclipai/shared";
import {
  addCommonClientOptions,
  handleCommandError,
  printOutput,
  resolveCommandContext,
  type BaseClientOptions,
} from "./common.js";

interface WorkflowRunOptions extends BaseClientOptions {
  companyId?: string;
  step: string[];
  goalId?: string;
  parentId?: string;
  priority?: string;
  watch?: boolean;
}

interface WorkflowStatusOptions extends BaseClientOptions {
  companyId?: string;
  pipelineId: string;
}

interface WorkflowListOptions extends BaseClientOptions {
  companyId?: string;
  agentId?: string;
  limit?: string;
}

interface ParsedStep {
  agentId: string;
  title: string;
}

const TERMINAL_STATUSES = new Set(["done", "cancelled", "blocked"]);
const POLL_INTERVAL_MS = 8_000;
const WATCH_TIMEOUT_MS = 60 * 60_000; // 1 hora

function parseStep(raw: string): ParsedStep {
  const sep = raw.indexOf(":");
  if (sep === -1) {
    throw new Error(
      `Formato de passo inválido: "${raw}". Use "agentId:Título da tarefa"`,
    );
  }
  return {
    agentId: raw.slice(0, sep).trim(),
    title: raw.slice(sep + 1).trim(),
  };
}

function statusIcon(status: string): string {
  switch (status) {
    case "done": return pc.green("✓");
    case "in_progress": return pc.yellow("⟳");
    case "blocked": return pc.red("✗");
    case "cancelled": return pc.dim("○");
    case "todo": return pc.dim("·");
    default: return pc.dim("?");
  }
}

export function registerWorkflowCommands(program: Command): void {
  const workflow = program
    .command("workflow")
    .description("Criar e monitorar pipelines multi-agente");

  // -------------------------------------------------------------------------
  // workflow run
  // -------------------------------------------------------------------------
  addCommonClientOptions(
    workflow
      .command("run")
      .description("Executa um pipeline sequencial de tarefas entre agentes")
      .requiredOption(
        "--step <agentId:título>",
        "Passo do pipeline no formato agentId:Título (pode ser repetido)",
        (val: string, prev: string[]) => [...prev, val],
        [] as string[],
      )
      .option("-C, --company-id <id>", "Company ID")
      .option("--goal-id <id>", "Goal ao qual as tarefas serão vinculadas")
      .option("--parent-id <id>", "Issue pai (para criar subtarefas)")
      .option(
        "--priority <level>",
        "Prioridade das tarefas: critical, high, medium, low",
        "medium",
      )
      .option("--watch", "Aguardar conclusão de cada passo em tempo real"),
    { includeCompany: true },
  ).action(async (opts: WorkflowRunOptions) => {
    try {
      const ctx = resolveCommandContext(opts, { requireCompany: true });
      const companyId = opts.companyId ?? ctx.companyId!;

      const steps = (opts.step ?? []).map(parseStep);
      if (steps.length === 0) {
        console.error(pc.red("É necessário pelo menos um --step."));
        process.exit(1);
      }

      if (!ctx.json) {
        console.log(
          pc.bold(
            `\n▶ Iniciando pipeline com ${steps.length} passo(s)...\n`,
          ),
        );
      }

      const createdTasks: Array<{ step: ParsedStep; issue: Issue }> = [];

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]!;
        const prev = createdTasks[i - 1];

        let description = step.title;
        if (prev) {
          description +=
            `\n\n---\n**Pipeline:** passo ${i + 1}/${steps.length}` +
            `\nTarefa anterior: \`${prev.issue.identifier}\` — ${prev.step.title}`;
        } else {
          description += `\n\n---\n**Pipeline:** passo ${i + 1}/${steps.length}`;
        }

        const payload: Record<string, unknown> = {
          companyId,
          title: step.title,
          description,
          assigneeAgentId: step.agentId,
          priority: opts.priority ?? "medium",
          status: "todo",
        };
        if (opts.goalId) payload.goalId = opts.goalId;
        if (opts.parentId) payload.parentId = opts.parentId;
        else if (prev) payload.parentId = prev.issue.id;

        const issue = await ctx.api.post<Issue>(
          `/api/companies/${companyId}/issues`,
          payload,
        );

        if (!issue) throw new Error("Falha ao criar tarefa no servidor.");

        createdTasks.push({ step, issue });

        if (!ctx.json) {
          console.log(
            `  ${pc.dim(`${i + 1}.`)} ${pc.cyan(issue.identifier)} → ${pc.white(step.title)} ` +
            `${pc.dim(`(agente: ${step.agentId.slice(0, 8)}...)`)}`,
          );
        }
      }

      if (!ctx.json) {
        console.log(
          pc.dim(`\n${steps.length} tarefa(s) criada(s) com sucesso.`),
        );
      }

      // Se --watch, aguardar conclusão sequencial
      if (opts.watch) {
        if (!ctx.json) {
          console.log(pc.bold("\n⏳ Monitorando execução do pipeline...\n"));
        }
        const deadline = Date.now() + WATCH_TIMEOUT_MS;

        for (const { issue, step } of createdTasks) {
          if (!ctx.json) {
            process.stdout.write(
              `  ${pc.dim("…")} ${pc.cyan(issue.identifier)} ${step.title}`,
            );
          }

          let current = issue;
          while (Date.now() < deadline) {
            if (TERMINAL_STATUSES.has(current.status)) break;
            await sleep(POLL_INTERVAL_MS);
            const updated = await ctx.api.get<Issue>(`/api/issues/${issue.id}`);
            if (updated) current = updated;
          }

          if (!ctx.json) {
            process.stdout.clearLine?.(0);
            process.stdout.cursorTo?.(0);
            console.log(
              `  ${statusIcon(current.status)} ${pc.cyan(current.identifier)} ` +
              `${step.title} ${pc.dim(`[${current.status}]`)}`,
            );
          }

          if (current.status === "blocked" || current.status === "cancelled") {
            if (!ctx.json) {
              console.log(
                pc.yellow(
                  `\n⚠ Pipeline interrompido no passo "${step.title}" (status: ${current.status}).`,
                ),
              );
            }
            break;
          }
        }

        if (!ctx.json) console.log();
      }

      if (ctx.json) {
        printOutput(
          createdTasks.map(({ step, issue }) => ({
            step: step.title,
            agentId: step.agentId,
            issueId: issue.id,
            identifier: issue.identifier,
            status: issue.status,
          })),
          { json: true },
        );
      } else {
        const firstId = createdTasks[0]?.issue.identifier ?? "";
        console.log(
          pc.bold("Pipeline iniciado. ") +
          `Use ${pc.cyan(`paperclipai workflow status --pipeline-id ${createdTasks[0]?.issue.id ?? "<id>"}`)} ` +
          `para acompanhar ou abra ${pc.underline(`/issues/${firstId}`)} no dashboard.\n`,
        );
      }
    } catch (err) {
      handleCommandError(err);
    }
  });

  // -------------------------------------------------------------------------
  // workflow status
  // -------------------------------------------------------------------------
  addCommonClientOptions(
    workflow
      .command("status")
      .description("Exibe o status de um pipeline pelo ID da primeira tarefa")
      .requiredOption("--pipeline-id <issueId>", "ID da primeira tarefa do pipeline")
      .option("-C, --company-id <id>", "Company ID"),
    { includeCompany: true },
  ).action(async (opts: WorkflowStatusOptions) => {
    try {
      const ctx = resolveCommandContext(opts, { requireCompany: true });
      const companyId = opts.companyId ?? ctx.companyId!;

      // Busca a tarefa raiz e suas subtarefas
      const root = await ctx.api.get<Issue>(`/api/issues/${opts.pipelineId}`);
      if (!root) {
        console.error(pc.red(`Tarefa ${opts.pipelineId} não encontrada.`));
        process.exit(1);
      }

      const qs = new URLSearchParams({ parentId: root.id });
      const children = await ctx.api.get<Issue[]>(
        `/api/companies/${companyId}/issues?${qs}`,
      ) ?? [];

      const allTasks = [root, ...children].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      if (ctx.json) {
        printOutput(allTasks, { json: true });
        return;
      }

      console.log(pc.bold(`\nPipeline: ${root.identifier} — ${root.title}\n`));
      for (const task of allTasks) {
        const agent = task.assigneeAgentId
          ? pc.dim(`@${task.assigneeAgentId.slice(0, 8)}…`)
          : pc.dim("(sem agente)");
        console.log(
          `  ${statusIcon(task.status)} ${pc.cyan(task.identifier)} ${task.title} ${agent}`,
        );
      }

      const done = allTasks.filter((t) => t.status === "done").length;
      const total = allTasks.length;
      const blocked = allTasks.some((t) => t.status === "blocked");

      console.log(
        `\n${pc.bold("Progresso:")} ${done}/${total} tarefas concluídas` +
        (blocked ? pc.yellow(" · pipeline bloqueado") : "") +
        "\n",
      );
    } catch (err) {
      handleCommandError(err);
    }
  });

  // -------------------------------------------------------------------------
  // workflow list
  // -------------------------------------------------------------------------
  addCommonClientOptions(
    workflow
      .command("list")
      .description("Lista tarefas atribuídas a um agente filtradas por status")
      .option("-C, --company-id <id>", "Company ID")
      .option("--agent-id <id>", "Filtrar por agente")
      .option("--limit <n>", "Número máximo de resultados", "20"),
    { includeCompany: true },
  ).action(async (opts: WorkflowListOptions) => {
    try {
      const ctx = resolveCommandContext(opts, { requireCompany: true });
      const companyId = opts.companyId ?? ctx.companyId!;
      const limit = parseInt(opts.limit ?? "20", 10);

      const qs = new URLSearchParams({ status: "todo,in_progress,blocked" });
      if (opts.agentId) qs.set("assigneeAgentId", opts.agentId);

      const issues = await ctx.api.get<Issue[]>(
        `/api/companies/${companyId}/issues?${qs}`,
      ) ?? [];

      const slice = issues.slice(0, limit);

      if (ctx.json) {
        printOutput(slice, { json: true });
        return;
      }

      if (slice.length === 0) {
        console.log(pc.dim("\nNenhuma tarefa ativa encontrada.\n"));
        return;
      }

      console.log(pc.bold(`\n${slice.length} tarefa(s) ativa(s):\n`));
      for (const issue of slice) {
        const agent = issue.assigneeAgentId
          ? pc.dim(`@${issue.assigneeAgentId.slice(0, 8)}…`)
          : pc.dim("(sem agente)");
        console.log(
          `  ${statusIcon(issue.status)} ${pc.cyan(issue.identifier)} ${issue.title} ${agent}`,
        );
      }
      console.log();
    } catch (err) {
      handleCommandError(err);
    }
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
