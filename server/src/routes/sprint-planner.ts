import { Router } from "express";
import {
  createSprintPlannerTaskSchema,
  updateSprintPlannerTaskStatusSchema,
  createSprintPlannerTicketSchema,
  addSprintPlannerCommentSchema,
  type UpdateSprintPlannerTaskStatus,
  type CreateSprintPlannerTicket,
  type AddSprintPlannerComment,
} from "@paperclipai/shared";
import type { SprintPlannerService } from "../services/sprint-planner.js";
import { validate } from "../middleware/validate.js";
import { unauthorized } from "../errors.js";

/**
 * Require that the caller is authenticated (board user or agent).
 * Sprint planner routes are not company-scoped — they proxy to an external
 * service — but we still require a valid actor identity.
 */
function assertAuthenticated(req: Express.Request): void {
  if (!req.actor || (req.actor.type !== "board" && req.actor.type !== "agent")) {
    throw unauthorized("Authentication required");
  }
}

/**
 * Thin REST proxy for non-Claude adapters (Codex, Gemini, OpenCode) that
 * cannot use MCP tools. These routes proxy to the sprint planner API using
 * the server's service account credentials. All routes require authentication.
 */
export function sprintPlannerProxyRoutes(sp: SprintPlannerService) {
  const router = Router();

  // ── READ routes ─────────────────────────────────────────────

  router.get("/sprint-planner/sprints/current", async (req, res) => {
    assertAuthenticated(req);
    const teamId = req.query.teamId as string | undefined;
    const sprint = await sp.getCurrentSprint(teamId);
    res.json(sprint);
  });

  router.get("/sprint-planner/sprints/:sprintId/tasks", async (req, res) => {
    assertAuthenticated(req);
    const sprintId = req.params.sprintId as string;
    const status = req.query.status as string | undefined;
    const assigneeId = req.query.assigneeId as string | undefined;
    const tasks = await sp.getSprintTasks(sprintId, { status, assigneeId });
    res.json(tasks);
  });

  router.get("/sprint-planner/sprints/:sprintId/stats", async (req, res) => {
    assertAuthenticated(req);
    const sprintId = req.params.sprintId as string;
    const stats = await sp.getSprintStats(sprintId);
    res.json(stats);
  });

  router.get("/sprint-planner/tasks/:taskId", async (req, res) => {
    assertAuthenticated(req);
    const taskId = req.params.taskId as string;
    const task = await sp.getTask(taskId);
    res.json(task);
  });

  router.get("/sprint-planner/backlog", async (req, res) => {
    assertAuthenticated(req);
    const tasks = await sp.getBacklog();
    res.json(tasks);
  });

  router.get("/sprint-planner/tickets", async (req, res) => {
    assertAuthenticated(req);
    const status = req.query.status as string | undefined;
    const priority = req.query.priority as string | undefined;
    const category = req.query.category as string | undefined;
    const tickets = await sp.getTickets({ status, priority, category });
    res.json(tickets);
  });

  router.get("/sprint-planner/tickets/:ticketId", async (req, res) => {
    assertAuthenticated(req);
    const ticketId = req.params.ticketId as string;
    const ticket = await sp.getTicket(ticketId);
    res.json(ticket);
  });

  // ── WRITE routes (validated) ────────────────────────────────

  router.post("/sprint-planner/tasks", validate(createSprintPlannerTaskSchema), async (req, res) => {
    assertAuthenticated(req);
    const task = await sp.createTask(req.body);
    res.status(201).json(task);
  });

  router.patch("/sprint-planner/tasks/:taskId/status", validate(updateSprintPlannerTaskStatusSchema), async (req, res) => {
    assertAuthenticated(req);
    const taskId = req.params.taskId as string;
    const body = req.body as UpdateSprintPlannerTaskStatus;
    const task = await sp.updateTaskStatus(taskId, body.status, body.note);
    res.json(task);
  });

  router.post("/sprint-planner/tasks/:taskId/comments", validate(addSprintPlannerCommentSchema), async (req, res) => {
    assertAuthenticated(req);
    const taskId = req.params.taskId as string;
    const body = req.body as AddSprintPlannerComment;
    const comment = await sp.addTaskComment(taskId, body.content);
    res.status(201).json(comment);
  });

  router.post("/sprint-planner/tickets", validate(createSprintPlannerTicketSchema), async (req, res) => {
    assertAuthenticated(req);
    const ticket = await sp.createTicket(req.body as CreateSprintPlannerTicket);
    res.status(201).json(ticket);
  });

  router.post("/sprint-planner/tickets/:ticketId/comments", validate(addSprintPlannerCommentSchema), async (req, res) => {
    assertAuthenticated(req);
    const ticketId = req.params.ticketId as string;
    const body = req.body as AddSprintPlannerComment;
    const comment = await sp.addTicketComment(ticketId, body.content, body.isInternal);
    res.status(201).json(comment);
  });

  return router;
}
