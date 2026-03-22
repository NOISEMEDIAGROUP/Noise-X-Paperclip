import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plug, ChevronRight, X } from "lucide-react";
import { integrationRecommendationsApi } from "@/api/integrationRecommendations";
import { queryKeys } from "@/lib/queryKeys";
import { useCompany } from "@/context/CompanyContext";
import { useIntegrationBlockEvents } from "@/hooks/useIntegrationBlockEvents";
import { IntegrationBlockModal } from "./IntegrationBlockModal";
import { cn } from "@/lib/utils";

interface IntegrationBlockBannerProps {
  className?: string;
}

export function IntegrationBlockBanner({ className }: IntegrationBlockBannerProps) {
  const { selectedCompanyId } = useCompany();
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Listen for real-time integration block events
  useIntegrationBlockEvents(selectedCompanyId ?? undefined);

  const { data: blocksData } = useQuery({
    queryKey: queryKeys.integrationBlocks(selectedCompanyId ?? ""),
    queryFn: () => integrationRecommendationsApi.getBlocks(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const blocks = blocksData?.blocks ?? [];
  const pendingBlocks = blocks.filter((b) => b.status === "pending");

  // Don't show if no blocks or dismissed
  if (pendingBlocks.length === 0 || dismissed) {
    return null;
  }

  const selectedBlock = pendingBlocks.find((b) => b.id === selectedBlockId) ?? pendingBlocks[0];

  // Critical block takes priority (modal-style urgency)
  const hasCritical = pendingBlocks.some((b) => b.isCritical);

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-md border px-4 py-3",
          hasCritical
            ? "border-amber-300 bg-amber-50 dark:border-amber-500/25 dark:bg-amber-950/60"
            : "border-blue-200 bg-blue-50 dark:border-blue-500/25 dark:bg-blue-950/60",
          className
        )}
      >
        <div className="flex items-center gap-2.5">
          <Plug
            className={cn(
              "h-4 w-4 shrink-0",
              hasCritical
                ? "text-amber-600 dark:text-amber-400"
                : "text-blue-600 dark:text-blue-400"
            )}
          />
          <div>
            <p
              className={cn(
                "text-sm font-medium",
                hasCritical
                  ? "text-amber-900 dark:text-amber-100"
                  : "text-blue-900 dark:text-blue-100"
              )}
            >
              {pendingBlocks.length === 1
                ? selectedBlock.message
                : `${pendingBlocks.length} agents are waiting for integrations`}
            </p>
            {pendingBlocks.length > 1 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {pendingBlocks.map((b) => b.integrationName).join(", ")}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedBlockId(selectedBlock.id)}
            className={cn(
              "text-sm font-medium underline underline-offset-2 shrink-0",
              hasCritical
                ? "text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
                : "text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
            )}
          >
            View details
            <ChevronRight className="h-4 w-4 inline ml-1" />
          </button>
          {!hasCritical && (
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <IntegrationBlockModal
        open={!!selectedBlockId}
        onOpenChange={(open) => !open && setSelectedBlockId(null)}
        block={selectedBlock}
      />
    </>
  );
}