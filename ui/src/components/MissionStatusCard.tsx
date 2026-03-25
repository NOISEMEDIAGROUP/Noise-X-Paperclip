import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bot, Clock, Calendar, Coins, Target } from "lucide-react";
import { Link } from "@/lib/router";
import { formatCents } from "@/lib/utils";
import { MissionStatus } from "@paperclipai/shared";
import { useMemo } from "react";
import type { Mission } from "@/api/missions";
import { useCompany } from "../context/CompanyContext";

interface ObjectiveProgress {
  completed: number;
  total: number;
}

interface MissionStatusCardProps {
  mission: Mission | null;
  isPending?: boolean;
}

export function MissionStatusCard({ mission, isPending }: MissionStatusCardProps) {
  const { selectedCompany } = useCompany();
  
  // Calculate objective progress
  const objectiveProgress = useMemo<ObjectiveProgress>(() => {
    if (!mission) return { completed: 0, total: 0 };
    
    // For now, just showing total objectives - in real implementation might distinguish completed vs pending
    return { completed: mission.status === 'completed' ? mission.objectives.length : 0, total: mission.objectives.length };
  }, [mission]);

  // Format budget display
  const budgetDisplay = useMemo(() => {
    if (!mission || !mission.budgetCapUsd) {
      return { label: "Unlimited Budget", className: "text-green-600" };
    }
    
    if (typeof mission.budgetSpentUsd !== 'undefined' && mission.budgetSpentUsd > 0) {
      const budgetUsed = (mission.budgetSpentUsd / mission.budgetCapUsd * 100).toFixed(1);
      return { 
        label: `${budgetUsed}% of ${formatCents(mission.budgetCapUsd * 100)} used`, 
        className: parseFloat(budgetUsed) > 80 ? "text-red-600" : "text-yellow-600" 
      };
    }
    
    return { label: `Budget: ${formatCents(mission.budgetCapUsd * 100)}`, className: "text-blue-600" };
  }, [mission]);

  // Determine status badge variant
  const statusVariant = (status: MissionStatus | undefined) => {
    switch (status) {
      case "active": return "default";
      case "draft": return "secondary";
      case "paused": return "outline";
      case "completed": return "secondary"; // Use secondary as an alternative to "success"
      case "failed": return "destructive";
      default: return "outline";
    }
  };

  if (isPending) {
    return (
      <Card className="bg-muted/30 animate-pulse">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium h-4 bg-muted rounded" style={{width: "120px"}} />
              <p className="text-xs text-muted-foreground h-3 bg-muted rounded mt-1" style={{width: "80px"}} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!mission) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">No Active Mission</CardTitle>
              <p className="text-xs text-muted-foreground">Set a goal for your agents</p>
            </div>
            <Badge variant="outline" className="text-xs mr-1">No Mission</Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-sm text-muted-foreground mb-3">A mission gives your agents a clear goal to work towards.</p>
          <Link 
            to={`/${selectedCompany?.issuePrefix || 'dashboard'}/missions/create`}
            className="inline-flex items-center text-sm font-medium underline"
          >
            Create a mission
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{mission.title}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {mission.status === 'active' && mission.startedAt && (
                <>Started {new Date(mission.startedAt).toLocaleDateString()}</>
              )}
              {mission.status === 'completed' && mission.completedAt && (
                <>Completed {new Date(mission.completedAt).toLocaleDateString()}</>
              )}
              {(mission.status === 'draft' || mission.status === 'paused') && (
                <>Created {new Date(mission.createdAt).toLocaleDateString()}</>
              )}
            </p>
          </div>
          <Badge variant={statusVariant(mission.status)} className="text-xs">
            {mission.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-3">
          {/* Objective progress */}
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-500" />
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span>Objectives</span>
                <span>{objectiveProgress.completed}/{objectiveProgress.total}</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all duration-300"
                  style={{
                    width: objectiveProgress.total > 0 
                      ? `${(objectiveProgress.completed / objectiveProgress.total) * 100}%`
                      : '0%'
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Budget status */}
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-green-500" />
            <span className={`text-sm ${budgetDisplay.className}`}>
              {budgetDisplay.label}
            </span>
          </div>

          {/* Autonomy level */}
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-500" />
            <span className="text-sm capitalize">{mission.autonomyLevel}</span>
          </div>

          {/* Expires indicator */}
          {mission.expiresAt && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-red-600">
                Expires {new Date(mission.expiresAt).toLocaleDateString()}
              </span>
            </div>
          )}

          <Separator className="my-2" />

          {/* Action button */}
          <div className="flex space-x-2 pt-2">
            <Link 
              to={`/${selectedCompany?.issuePrefix || 'dashboard'}/missions/${mission.id}`}
              className="text-sm font-medium underline"
            >
              View details
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link 
              to={`/${selectedCompany?.issuePrefix || 'dashboard'}/agents`}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Check progress
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}