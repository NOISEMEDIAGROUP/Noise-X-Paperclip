export interface VisionExemptIssueInput {
  title?: string | null;
  description?: string | null;
  priority?: string | null;
}

export function isVisionExemptIssue(input: VisionExemptIssueInput) {
  if ((input.priority ?? "").toLowerCase() === "critical") return true;
  const text = `${input.title ?? ""}\n${input.description ?? ""}`.toLowerCase();
  return (
    text.includes("[no_vision]") ||
    text.includes("[no-vision]") ||
    /\b(hotfix|bugfix|regression|incident|ops)\b/i.test(text)
  );
}

export function shouldEnforceVisionGateForActor(input: {
  actorType: "board" | "agent" | "none";
  actorRole?: string | null;
  enforceBoardVisionGate: boolean;
  governedAgentRoles: ReadonlySet<string>;
}) {
  if (input.actorType === "board") return input.enforceBoardVisionGate;
  if (!input.actorRole) return false;
  return input.governedAgentRoles.has(input.actorRole);
}

export function parseMaxChildIssuesPerRun(rawValue: string | undefined, fallback = 4) {
  const parsed = Number(rawValue ?? fallback);
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return fallback;
}
