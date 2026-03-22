import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/lib/router";
import { ChevronDown, ChevronUp, Sparkles, Lightbulb } from "lucide-react";
import { integrationRecommendationsApi } from "@/api/integrationRecommendations";
import { queryKeys } from "@/lib/queryKeys";
import { useCompany } from "@/context/CompanyContext";
import { AgentRecommendationCard } from "@/components/AgentRecommendationCard";
import { cn } from "@/lib/utils";
import type { IntegrationRecommendation } from "@paperclipai/shared";

interface RecommendationsSectionProps {
  className?: string;
}

/**
 * Sort recommendations by priority:
 * 1. Open-source + free (highest priority)
 * 2. Free tier
 * 3. Paid (lowest priority)
 */
function sortRecommendations(
  recommendations: IntegrationRecommendation[]
): IntegrationRecommendation[] {
  return [...recommendations].sort((a, b) => {
    // First by open-source (true comes first)
    if (a.isOpenSource !== b.isOpenSource) {
      return a.isOpenSource ? -1 : 1;
    }
    // Then by free (true comes first)
    if (a.isFree !== b.isFree) {
      return a.isFree ? -1 : 1;
    }
    // Then by priority (lower number = higher priority)
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // Finally by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function RecommendationsSection({ className }: RecommendationsSectionProps) {
  const { selectedCompanyId } = useCompany();
  const [showDismissed, setShowDismissed] = useState(false);

  const { data: recommendationsData, isLoading } = useQuery({
    queryKey: queryKeys.integrationRecommendations(selectedCompanyId ?? ""),
    queryFn: () => integrationRecommendationsApi.getRecommendations(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const pending = recommendationsData?.pending ?? [];
  const connected = recommendationsData?.connected ?? [];
  const dismissed = recommendationsData?.dismissed ?? [];

  // Sort pending by priority
  const sortedPending = sortRecommendations(pending);
  const sortedConnected = sortRecommendations(connected);
  const sortedDismissed = sortRecommendations(dismissed);

  const totalRecommendations = pending.length + connected.length + dismissed.length;

  if (isLoading) {
    return (
      <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
        <p className="text-sm text-muted-foreground">Loading recommendations...</p>
      </div>
    );
  }

  if (totalRecommendations === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Pending Recommendations */}
      {sortedPending.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <h3 className="font-medium text-sm">Agent Recommendations</h3>
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {sortedPending.length}
              </span>
            </div>
            <Link
              to="/settings/integrations"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Setup integrations
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {sortedPending.map((rec) => (
              <AgentRecommendationCard
                key={rec.id}
                recommendation={rec}
              />
            ))}
          </div>
        </div>
      )}

      {/* Connected Recommendations */}
      {sortedConnected.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-green-500" />
              <h3 className="font-medium text-sm">Connected via Recommendations</h3>
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {sortedConnected.length}
              </span>
            </div>
          </div>
          <div className="p-4 grid gap-3 md:grid-cols-2">
            {sortedConnected.map((rec) => (
              <AgentRecommendationCard
                key={rec.id}
                recommendation={rec}
              />
            ))}
          </div>
        </div>
      )}

      {/* Dismissed Recommendations (collapsible) */}
      {sortedDismissed.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <button
            onClick={() => setShowDismissed(!showDismissed)}
            className="flex items-center justify-between w-full px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm text-muted-foreground">
                Dismissed Recommendations
              </h3>
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {sortedDismissed.length}
              </span>
            </div>
            {showDismissed ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showDismissed && (
            <div className="p-4 pt-0 grid gap-3 md:grid-cols-2">
              {sortedDismissed.map((rec) => (
                <AgentRecommendationCard
                  key={rec.id}
                  recommendation={rec}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}