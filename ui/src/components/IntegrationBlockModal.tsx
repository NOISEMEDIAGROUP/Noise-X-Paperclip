import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { integrationRecommendationsApi } from "@/api/integrationRecommendations";
import { queryKeys } from "@/lib/queryKeys";
import { useCompany } from "@/context/CompanyContext";
import { Plug, Clock, ExternalLink, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntegrationBlock, IntegrationCatalog } from "@paperclipai/shared";

interface IntegrationBlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: IntegrationBlock | null;
  integration?: IntegrationCatalog | null;
  onSetup?: () => void;
}

export function IntegrationBlockModal({
  open,
  onOpenChange,
  block,
  integration,
  onSetup,
}: IntegrationBlockModalProps) {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const dismissMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCompanyId || !block) return;
      return integrationRecommendationsApi.dismissBlock(
        selectedCompanyId,
        block.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.integrationBlocks(selectedCompanyId!),
      });
      onOpenChange(false);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCompanyId || !block) return;
      return integrationRecommendationsApi.resolveBlock(
        selectedCompanyId,
        block.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.integrationBlocks(selectedCompanyId!),
      });
      onOpenChange(false);
    },
  });

  if (!block) return null;

  const isFree = integration?.isFree ?? true;
  const isOpenSource = integration?.isOpenSource ?? false;
  const setupTime = integration?.setupTimeMinutes ?? 5;
  const setupDifficulty = integration?.setupDifficulty ?? "easy";
  const icon = integration?.icon ?? "plug";
  const freeTierLimit = integration?.freeTierLimit;
  const paidPrice = integration?.paidPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Plug className="h-5 w-5 text-primary" />
            Integration Required
          </DialogTitle>
          <DialogDescription className="text-left">
            {block.message}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          {/* Integration header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-background border border-border">
                <span className="text-sm font-medium capitalize">
                  {block.integrationName.slice(0, 2)}
                </span>
              </div>
              <div>
                <h4 className="font-medium text-sm">
                  {block.integrationName}
                </h4>
                {isFree && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    {isOpenSource ? "Open Source • Free" : "Free"}
                  </span>
                )}
                {!isFree && paidPrice && (
                  <span className="text-xs text-muted-foreground">
                    {paidPrice}
                  </span>
                )}
              </div>
            </div>
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                isFree
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              )}
            >
              {isFree ? "FREE" : "PAID"}
            </span>
          </div>

          {/* Setup info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>~{setupTime} min setup</span>
            </div>
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  setupDifficulty === "easy"
                    ? "bg-green-500"
                    : setupDifficulty === "medium"
                    ? "bg-yellow-500"
                    : "bg-red-500"
                )}
              />
              <span className="capitalize">{setupDifficulty}</span>
            </div>
          </div>

          {/* Free tier info */}
          {isFree && freeTierLimit && (
            <div className="text-xs text-muted-foreground bg-background/50 rounded px-2 py-1">
              Free tier: {freeTierLimit}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => dismissMutation.mutate()}
            disabled={dismissMutation.isPending}
            className="w-full sm:w-auto"
          >
            Skip for now
          </Button>
          <Button
            onClick={() => {
              if (onSetup) {
                onSetup();
              } else {
                // Default: mark as resolved (user will set up manually)
                resolveMutation.mutate();
              }
            }}
            disabled={resolveMutation.isPending}
            className="w-full sm:w-auto"
          >
            {onSetup ? (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect {block.integrationName}
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Mark as Connected
              </>
            )}
          </Button>
        </DialogFooter>

        <p className="text-xs text-muted-foreground text-center">
          💡 You can also set this up later in{" "}
          <a
            href="/settings/integrations"
            className="underline hover:text-foreground"
          >
            Settings → Integrations
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
}