import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { projectWorkspaces } from "@paperclipai/db";
import { eq } from "drizzle-orm";
import { gitService } from "../services/git.js";
import { assertCompanyAccess } from "./authz.js";

export function gitRoutes(db: Db) {
  const router = Router();
  const git = gitService();

  /** Resolve workspace and validate access, returning its cwd */
  async function resolveWorkspaceCwd(req: any, res: any): Promise<string | null> {
    const workspaceId = req.params.workspaceId as string;
    const workspace = await db
      .select()
      .from(projectWorkspaces)
      .where(eq(projectWorkspaces.id, workspaceId))
      .then((rows) => rows[0] ?? null);

    if (!workspace) {
      res.status(404).json({ error: "Workspace not found" });
      return null;
    }
    assertCompanyAccess(req, workspace.companyId);

    if (!workspace.cwd) {
      res.status(422).json({ error: "Workspace has no local directory" });
      return null;
    }
    return workspace.cwd;
  }

  // GET /git/:workspaceId/status
  router.get("/git/:workspaceId/status", async (req, res) => {
    const cwd = await resolveWorkspaceCwd(req, res);
    if (!cwd) return;
    const status = await git.status(cwd);
    res.json(status);
  });

  // GET /git/:workspaceId/log
  router.get("/git/:workspaceId/log", async (req, res) => {
    const cwd = await resolveWorkspaceCwd(req, res);
    if (!cwd) return;
    const maxCount = Math.min(Number(req.query.maxCount) || 20, 100);
    const log = await git.log(cwd, maxCount);
    res.json(log);
  });

  // GET /git/:workspaceId/branches
  router.get("/git/:workspaceId/branches", async (req, res) => {
    const cwd = await resolveWorkspaceCwd(req, res);
    if (!cwd) return;
    const branches = await git.branches(cwd);
    res.json(branches);
  });

  // POST /git/:workspaceId/branch
  router.post("/git/:workspaceId/branch", async (req, res) => {
    const cwd = await resolveWorkspaceCwd(req, res);
    if (!cwd) return;
    const { name } = req.body as { name: string };
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Branch name is required" });
      return;
    }
    await git.createBranch(cwd, name.trim());
    const status = await git.status(cwd);
    res.json({ branch: status.branch?.current ?? name.trim() });
  });

  // POST /git/:workspaceId/checkout
  router.post("/git/:workspaceId/checkout", async (req, res) => {
    const cwd = await resolveWorkspaceCwd(req, res);
    if (!cwd) return;
    const { branch } = req.body as { branch: string };
    if (!branch || typeof branch !== "string") {
      res.status(400).json({ error: "Branch name is required" });
      return;
    }
    await git.checkout(cwd, branch.trim());
    res.json({ branch: branch.trim() });
  });

  // POST /git/:workspaceId/commit
  router.post("/git/:workspaceId/commit", async (req, res) => {
    const cwd = await resolveWorkspaceCwd(req, res);
    if (!cwd) return;
    const { message } = req.body as { message: string };
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({ error: "Commit message is required" });
      return;
    }
    const result = await git.commit(cwd, message.trim());
    res.json(result);
  });

  // POST /git/:workspaceId/push
  router.post("/git/:workspaceId/push", async (req, res) => {
    const cwd = await resolveWorkspaceCwd(req, res);
    if (!cwd) return;
    const setUpstream = req.body?.setUpstream === true;
    await git.push(cwd, setUpstream);
    res.json({ success: true });
  });

  // POST /git/:workspaceId/fetch
  router.post("/git/:workspaceId/fetch", async (req, res) => {
    const cwd = await resolveWorkspaceCwd(req, res);
    if (!cwd) return;
    await git.fetch(cwd);
    res.json({ success: true });
  });

  // POST /git/:workspaceId/pull
  router.post("/git/:workspaceId/pull", async (req, res) => {
    const cwd = await resolveWorkspaceCwd(req, res);
    if (!cwd) return;
    await git.pull(cwd);
    res.json({ success: true });
  });

  // POST /git/:workspaceId/reset-to-remote
  router.post("/git/:workspaceId/reset-to-remote", async (req, res) => {
    const cwd = await resolveWorkspaceCwd(req, res);
    if (!cwd) return;
    const result = await git.resetToRemote(cwd);
    res.json(result);
  });

  // POST /git/:workspaceId/discard-file
  router.post("/git/:workspaceId/discard-file", async (req, res) => {
    const cwd = await resolveWorkspaceCwd(req, res);
    if (!cwd) return;
    const { path: filePath } = req.body as { path: string };
    if (!filePath || typeof filePath !== "string") {
      res.status(400).json({ error: "File path is required" });
      return;
    }
    await git.discardFile(cwd, filePath);
    res.json({ success: true });
  });

  // POST /git/:workspaceId/stage
  router.post("/git/:workspaceId/stage", async (req, res) => {
    const cwd = await resolveWorkspaceCwd(req, res);
    if (!cwd) return;
    const { files } = req.body as { files: string[] };
    if (!Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: "Files array is required" });
      return;
    }
    await git.stageFiles(cwd, files);
    res.json({ success: true });
  });

  // POST /git/:workspaceId/unstage
  router.post("/git/:workspaceId/unstage", async (req, res) => {
    const cwd = await resolveWorkspaceCwd(req, res);
    if (!cwd) return;
    const { files } = req.body as { files: string[] };
    if (!Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: "Files array is required" });
      return;
    }
    await git.unstageFiles(cwd, files);
    res.json({ success: true });
  });

  // GET /git/:workspaceId/diff
  router.get("/git/:workspaceId/diff", async (req, res) => {
    const cwd = await resolveWorkspaceCwd(req, res);
    if (!cwd) return;
    const filePath = typeof req.query.path === "string" ? req.query.path : undefined;
    const diff = await git.diff(cwd, filePath);
    res.json({ diff });
  });

  // POST /git/:workspaceId/stash
  router.post("/git/:workspaceId/stash", async (req, res) => {
    const cwd = await resolveWorkspaceCwd(req, res);
    if (!cwd) return;
    const message = typeof req.body?.message === "string" ? req.body.message : undefined;
    await git.stash(cwd, message);
    res.json({ success: true });
  });

  // POST /git/:workspaceId/stash-pop
  router.post("/git/:workspaceId/stash-pop", async (req, res) => {
    const cwd = await resolveWorkspaceCwd(req, res);
    if (!cwd) return;
    await git.stashPop(cwd);
    res.json({ success: true });
  });

  return router;
}
