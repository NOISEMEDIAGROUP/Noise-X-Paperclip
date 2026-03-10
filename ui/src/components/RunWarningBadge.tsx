import type { StderrStats } from "@paperclipai/shared";
import { AlertTriangle } from "lucide-react";
import { cn } from "../lib/utils";

export function hasBenignStderrWarnings(stderrStats: StderrStats | null | undefined): stderrStats is StderrStats {
  return Boolean(stderrStats && stderrStats.errorCount === 0 && stderrStats.benignCount > 0);
}

export function RunWarningBadge({
  stderrStats,
  className,
}: {
  stderrStats: StderrStats | null | undefined;
  className?: string;
}) {
  if (!hasBenignStderrWarnings(stderrStats)) return null;

  const count = stderrStats.benignCount;
  const label = `${count} warning${count === 1 ? "" : "s"}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
        className,
      )}
      title={`${count} benign stderr line${count === 1 ? "" : "s"} captured during a successful run`}
    >
      <AlertTriangle className="h-3 w-3" />
      {label}
    </span>
  );
}
