function normalizeMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }
  if (typeof error === "string") {
    return error.toLowerCase();
  }
  return "";
}

export function isNetworkErrorLike(error: unknown): boolean {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number" &&
    (error as { status: number }).status === 0
  ) {
    return true;
  }

  const message = normalizeMessage(error);
  if (!message) return false;

  return (
    message.includes("paperclip api is temporarily unreachable") ||
    message.includes("network error while requesting") ||
    message.includes("failed to fetch") ||
    message.includes("err_connection_refused") ||
    message.includes("networkerror when attempting to fetch resource")
  );
}

export function networkRetryDelayMs(attempt: number): number {
  const normalizedAttempt = Number.isFinite(attempt) ? Math.max(0, Math.floor(attempt)) : 0;
  return Math.min(15_000, 1_000 * 2 ** Math.min(normalizedAttempt, 4));
}
