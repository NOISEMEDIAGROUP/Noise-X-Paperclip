import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { and, count, eq, gt, isNull } from "drizzle-orm";
import { invites } from "@paperclipai/db";
import type { DeploymentExposure, DeploymentMode } from "@paperclipai/shared";
import {
  getInstanceBootstrapState
} from "../services/instance-bootstrap.js";
import { getBoardClaimPath } from "../board-claim.js";

export function healthRoutes(
  db?: Db,
  opts: {
    deploymentMode: DeploymentMode;
    deploymentExposure: DeploymentExposure;
    authReady: boolean;
    companyDeletionEnabled: boolean;
  } = {
    deploymentMode: "local_trusted",
    deploymentExposure: "private",
    authReady: true,
    companyDeletionEnabled: true,
  },
) {
  const router = Router();

  router.get("/", async (_req, res) => {
    if (!db) {
      res.json({ status: "ok" });
      return;
    }

    let bootstrapStatus: "ready" | "bootstrap_pending" | "board_claim_required" =
      "ready";
    let bootstrapInviteActive = false;
    let boardClaimPath: string | null = null;
    if (opts.deploymentMode === "authenticated") {
      const bootstrapState = await getInstanceBootstrapState(db);
      bootstrapStatus = bootstrapState.status;

      if (bootstrapStatus === "bootstrap_pending") {
        const now = new Date();
        const inviteCount = await db
          .select({ count: count() })
          .from(invites)
          .where(
            and(
              eq(invites.inviteType, "bootstrap_ceo"),
              isNull(invites.revokedAt),
              isNull(invites.acceptedAt),
              gt(invites.expiresAt, now),
            ),
          )
          .then((rows) => Number(rows[0]?.count ?? 0));
        bootstrapInviteActive = inviteCount > 0;
      }

      if (bootstrapStatus === "board_claim_required") {
        boardClaimPath = getBoardClaimPath();
      }
    }

    res.json({
      status: "ok",
      deploymentMode: opts.deploymentMode,
      deploymentExposure: opts.deploymentExposure,
      authReady: opts.authReady,
      bootstrapStatus,
      bootstrapInviteActive,
      boardClaimPath,
      features: {
        companyDeletionEnabled: opts.companyDeletionEnabled,
      },
    });
  });

  return router;
}
