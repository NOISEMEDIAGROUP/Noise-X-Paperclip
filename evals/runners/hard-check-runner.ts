import type { HardCheck } from "../types.js";

export function runHardChecks(output: string, checks: HardCheck[]): { passed: boolean; failures: string[] } {
  const failures: string[] = [];

  for (const check of checks) {
    let matched = false;

    switch (check.type) {
      case "contains":
        matched = output.toLowerCase().includes(check.value.toLowerCase());
        break;
      case "regex":
        matched = new RegExp(check.value, "i").test(output);
        break;
      case "json_path": {
        try {
          const parsed = JSON.parse(output);
          const keys = (check.path ?? "").split(".");
          let val: unknown = parsed;
          for (const k of keys) {
            if (val && typeof val === "object" && k in val) {
              val = (val as Record<string, unknown>)[k];
            } else {
              val = undefined;
              break;
            }
          }
          matched = String(val).toLowerCase().includes(check.value.toLowerCase());
        } catch {
          matched = false;
        }
        break;
      }
    }

    if (check.negate) matched = !matched;

    if (!matched) {
      failures.push(`${check.negate ? "NOT " : ""}${check.type}(${check.value})${check.path ? ` at ${check.path}` : ""}`);
    }
  }

  return { passed: failures.length === 0, failures };
}
