import { and, count, eq, ne } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  authAccounts,
  authSessions,
  authUsers,
  instanceUserRoles
} from "@paperclipai/db";

export const LOCAL_BOARD_USER_ID = "local-board";

export type InstanceBootstrapStatus =
  | "ready"
  | "bootstrap_pending"
  | "board_claim_required";

export type InstanceBootstrapState = {
  status: InstanceBootstrapStatus;
  nonLocalAdminCount: number;
  localBoardAdmin: boolean;
  credentialedLocalBoardAdmin: boolean;
};

async function countRows(
  input: PromiseLike<Array<{ count: number | string | bigint | null | undefined }>>
) {
  const rows = await input;
  return Number(rows[0]?.count ?? 0);
}

export async function getInstanceBootstrapState(
  db: Db
): Promise<InstanceBootstrapState> {
  const nonLocalAdminCount = await countRows(
    db
      .select({ count: count() })
      .from(instanceUserRoles)
      .where(
        and(
          eq(instanceUserRoles.role, "instance_admin"),
          ne(instanceUserRoles.userId, LOCAL_BOARD_USER_ID)
        )
      )
  );

  if (nonLocalAdminCount > 0) {
    return {
      status: "ready",
      nonLocalAdminCount,
      localBoardAdmin: false,
      credentialedLocalBoardAdmin: false
    };
  }

  const localBoardAdminCount = await countRows(
    db
      .select({ count: count() })
      .from(instanceUserRoles)
      .where(
        and(
          eq(instanceUserRoles.role, "instance_admin"),
          eq(instanceUserRoles.userId, LOCAL_BOARD_USER_ID)
        )
      )
  );

  if (localBoardAdminCount === 0) {
    return {
      status: "bootstrap_pending",
      nonLocalAdminCount: 0,
      localBoardAdmin: false,
      credentialedLocalBoardAdmin: false
    };
  }

  const [localBoardUserCount, localBoardAccountCount, localBoardSessionCount] =
    await Promise.all([
      countRows(
        db
          .select({ count: count() })
          .from(authUsers)
          .where(eq(authUsers.id, LOCAL_BOARD_USER_ID))
      ),
      countRows(
        db
          .select({ count: count() })
          .from(authAccounts)
          .where(eq(authAccounts.userId, LOCAL_BOARD_USER_ID))
      ),
      countRows(
        db
          .select({ count: count() })
          .from(authSessions)
          .where(eq(authSessions.userId, LOCAL_BOARD_USER_ID))
      )
    ]);

  const credentialedLocalBoardAdmin =
    localBoardUserCount > 0 &&
    (localBoardAccountCount > 0 || localBoardSessionCount > 0);

  return {
    status: credentialedLocalBoardAdmin ? "ready" : "board_claim_required",
    nonLocalAdminCount: 0,
    localBoardAdmin: true,
    credentialedLocalBoardAdmin
  };
}
