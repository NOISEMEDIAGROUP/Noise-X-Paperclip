export function normalizeClaudeOauthToken(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/\s+/g, "").trim();
  return normalized.length > 0 ? normalized : undefined;
}
