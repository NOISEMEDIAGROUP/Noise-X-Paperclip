import { ApiError, apiFetch } from "./client";

export type HealthStatus = {
  status: "ok";
  deploymentMode?: "local_trusted" | "authenticated";
  deploymentExposure?: "private" | "public";
  authReady?: boolean;
  bootstrapStatus?: "ready" | "bootstrap_pending";
  bootstrapInviteActive?: boolean;
  features?: {
    companyDeletionEnabled?: boolean;
  };
};

export const healthApi = {
  get: async (): Promise<HealthStatus> => {
    let res: Response;
    try {
      res = await apiFetch("/health", {
        headers: { Accept: "application/json" },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Network error while requesting /api/health. Verify that the Paperclip server is reachable. (${reason})`,
      );
    }
    if (!res.ok) {
      const payload = await res.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error ?? `Failed to load health (${res.status})`);
    }
    return res.json();
  },

  ping: async (): Promise<boolean> => {
    try {
      const res = await apiFetch(
        "/health",
        {
          headers: { Accept: "application/json" },
          cache: "no-store",
        },
        { bypassNetworkBreaker: true },
      );
      return res.ok;
    } catch {
      return false;
    }
  },
};
