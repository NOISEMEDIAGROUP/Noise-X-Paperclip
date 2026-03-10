export interface PromptCacheWarning {
  variable: string;
  message: string;
}

const VOLATILE_TEMPLATE_WARNINGS: Array<PromptCacheWarning> = [
  {
    variable: "runId",
    message: "Includes a unique run ID on every heartbeat, which defeats prompt-prefix stability.",
  },
  {
    variable: "run.id",
    message: "Includes a unique run ID on every heartbeat, which defeats prompt-prefix stability.",
  },
  {
    variable: "context",
    message: "Serializes the entire wake context, which is bulky and often includes volatile fields.",
  },
  {
    variable: "context.now",
    message: "Includes a fresh timestamp on each wake, which defeats prompt-prefix stability.",
  },
];

function templateIncludesVariable(template: string, variable: string) {
  const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`{{\\s*${escaped}\\s*}}`);
  return pattern.test(template);
}

export function analyzePromptCacheability(template: string | null | undefined): PromptCacheWarning[] {
  if (typeof template !== "string" || template.trim().length === 0) return [];
  return VOLATILE_TEMPLATE_WARNINGS.filter((warning) =>
    templateIncludesVariable(template, warning.variable),
  );
}
