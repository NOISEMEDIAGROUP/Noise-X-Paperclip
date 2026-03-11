import { ApiError, apiFetch } from "./client";

export type AuthSession = {
  session: { id: string; userId: string };
  user: { id: string; email: string | null; name: string | null };
};

function toSession(value: unknown): AuthSession | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const sessionValue = record.session;
  const userValue = record.user;
  if (!sessionValue || typeof sessionValue !== "object") return null;
  if (!userValue || typeof userValue !== "object") return null;
  const session = sessionValue as Record<string, unknown>;
  const user = userValue as Record<string, unknown>;
  if (typeof session.id !== "string" || typeof session.userId !== "string") return null;
  if (typeof user.id !== "string") return null;
  return {
    session: { id: session.id, userId: session.userId },
    user: {
      id: user.id,
      email: typeof user.email === "string" ? user.email : null,
      name: typeof user.name === "string" ? user.name : null,
    },
  };
}

async function authPost(path: string, body: Record<string, unknown>) {
  const apiPath = `/auth${path}`;
  const requestUrl = `/api${apiPath}`;
  let res: Response;
  try {
    res = await apiFetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.message);
    }
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Network error while requesting ${requestUrl}. Verify that the Paperclip server is reachable. (${reason})`,
    );
  }
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (payload as { error?: { message?: string } | string } | null)?.error &&
      typeof (payload as { error?: { message?: string } | string }).error === "object"
        ? ((payload as { error?: { message?: string } }).error?.message ?? `Request failed: ${res.status}`)
        : (payload as { error?: string } | null)?.error ?? `Request failed: ${res.status}`;
    throw new Error(message);
  }
  return payload;
}

export const authApi = {
  getSession: async (): Promise<AuthSession | null> => {
    const apiPath = "/auth/get-session";
    let res: Response;
    try {
      res = await apiFetch(apiPath, {
        headers: { Accept: "application/json" },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Network error while requesting /api${apiPath}. Verify that the Paperclip server is reachable. (${reason})`,
      );
    }
    if (res.status === 401) return null;
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(`Failed to load session (${res.status})`);
    }
    const direct = toSession(payload);
    if (direct) return direct;
    const nested = payload && typeof payload === "object" ? toSession((payload as Record<string, unknown>).data) : null;
    return nested;
  },

  signInEmail: async (input: { email: string; password: string }) => {
    await authPost("/sign-in/email", input);
  },

  signUpEmail: async (input: { name: string; email: string; password: string }) => {
    await authPost("/sign-up/email", input);
  },

  signOut: async () => {
    await authPost("/sign-out", {});
  },
};
