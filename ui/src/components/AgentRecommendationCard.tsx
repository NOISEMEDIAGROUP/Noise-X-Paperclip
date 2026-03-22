import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { integrationRecommendationsApi } from "@/api/integrationRecommendations";
import { queryKeys } from "@/lib/queryKeys";
import { useCompany } from "@/context/CompanyContext";
import { Plug, ExternalLink, Check, X, Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntegrationRecommendation } from "@paperclipai/shared";

interface AgentRecommendationCardProps {
  recommendation: IntegrationRecommendation;
  onSetup?: () => void;
  compact?: boolean;
}

export function AgentRecommendationCard({
  recommendation,
  onSetup,
  compact = false,
}: AgentRecommendationCardProps) {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const dismissMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCompanyId) return;
      return integrationRecommendationsApi.dismissRecommendation(
        selectedCompanyId,
        recommendation.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.integrationRecommendations(selectedCompanyId!),
      });
    },
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCompanyId) return;
      return integrationRecommendationsApi.connectRecommendation(
        selectedCompanyId,
        recommendation.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.integrationRecommendations(selectedCompanyId!),
      });
    },
  });

  const isFree = recommendation.isFree;
  const isOpenSource = recommendation.isOpenSource;
  const pricingNotes = recommendation.pricingNotes;

  // Compact view for sidebar/dashboard
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card p-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center h-7 w-7 rounded-md bg-muted shrink-0">
            <span className="text-xs font-medium capitalize">
              {recommendation.integrationName.slice(0, 2)}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate">
                {recommendation.integrationName}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
                  isFree
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                )}
              >
                {isFree ? "FREE" : "PAID"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {recommendation.reason}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => dismissMutation.mutate()}
          disabled={dismissMutation.isPending}
          className="shrink-0 h-7 w-7 p-0"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // Full card for Settings page
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header with agent info */}
      {recommendation.agentRole && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="capitalize">{recommendation.agentRole}</span>
          <span className="text-muted-foreground/60">recommends</span>
        </div>
      )}

      {/* Integration info */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-9 w-9 rounded-md bg-muted border border-border">
            <span className="text-sm font-medium capitalize">
              {recommendation.integrationName.slice(0, 2)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">
                {recommendation.integrationName}
              </h4>
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  isFree
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                )}
              >
                {isFree ? (isOpenSource ? "Open Source • FREE" : "FREE") : "PAID"}
              </span>
            </div>
            {isFree && pricingNotes && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {pricingNotes}
              </p>
            )}
            {!isFree && pricingNotes && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {pricingNotes}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Reason */}
      <p className="text-sm text-muted-foreground mb-3">
        {recommendation.reason}
      </p>

      {/* Task context if available */}
      {recommendation.taskTitle && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 bg-muted/50 rounded px-2 py-1.5">
          <Clock className="h-3 w-3" />
          <span>For task: {recommendation.taskTitle}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {recommendation.status === "pending" && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => dismissMutation.mutate()}
              disabled={dismissMutation.isPending || connectMutation.isPending}
              className="flex-1"
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Dismiss
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (onSetup) {
                  onSetup();
                } else {
                  connectMutation.mutate();
                }
              }}
              disabled={dismissMutation.isPending || connectMutation.isPending}
              className="flex-1"
            >
              {onSetup ? (
                <>
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Connect
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Mark Connected
                </>
              )}
            </Button>
          </>
        )}
        {recommendation.status === "connected" && (
          <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
            <Check className="h-4 w-4" />
            <span>Connected</span>
          </div>
        )}
        {recommendation.status === "dismissed" && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <X className="h-4 w-4" />
            <span>Dismissed</span>
          </div>
        )}
      </div>
    </div>
  );
}