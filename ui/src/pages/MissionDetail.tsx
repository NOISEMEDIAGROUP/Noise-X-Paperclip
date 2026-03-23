import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/card";

import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { missionsApi } from "../api/missions";
import { queryKeys } from "../lib/queryKeys";
import { 
  Clock, 
  Target, 
  Coins, 
  Bot, 
  Calendar, 
  Play, 
  Pause, 
  RotateCcw,
  CheckCircle2,
  Circle,
  AlertCircle,
  Eye,
  MessageCircle,
  ExternalLink,
  BarChart3
} from "lucide-react";
import type { Mission } from "../api/missions";

export function MissionDetail() {
  const { missionId } = useParams<{ missionId: string }>();
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { 
    data: mission, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: queryKeys.missions.detail(missionId!),
    queryFn: async () => {
      // Assuming we have a company context providing selectedCompanyId  
      // In real implementation you would use this from context  
      const selectedCompanyId = localStorage.getItem('selectedCompanyId') || ''; // fallback to demo implementation  
      return await missionsApi.get(selectedCompanyId, missionId!);
    },
    enabled: !!missionId,
  });

  const [completedObjectives, setCompletedObjectives] = useState(0);

  useEffect(() => {
    if (mission) {
      // Count completed objectives based on their status (for real implementation, there would be status for each objective) 
      const completedCount = mission.objectives.filter(obj => 
        obj.toLowerCase().includes('done') || obj.toLowerCase().includes('completed') || obj.toLowerCase().includes('finished')
      ).length;
      setCompletedObjectives(completedCount);
    }
  }, [mission]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <h3 className="font-semibold">Mission not found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              The mission you're looking for doesn't exist or you don't have permission to access it.
            </p>
            <Button 
              className="mt-4" 
              variant="outline" 
              onClick={() => navigate("/")}
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Function to determine status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "draft": return "secondary";
      case "paused": return "outline"; 
      case "completed": return "secondary";
      case "failed": return "destructive";
      default: return "outline";
    }
  };

  // Handler functions for mission controls
  const handleLaunch = async () => {
    if (!mission.id) return;
    try {
      // In real implementation, would get company Id from context
      const selectedCompanyId = localStorage.getItem('selectedCompanyId') || '';
      const updatedMission = await missionsApi.launch(selectedCompanyId, mission.id);
      // Refetch to get updated mission info:
      refetch();
    } catch (err) {
      console.error("Failed to launch mission:", err);
    }
  };

  const handlePause = async () => {
    if (!mission.id) return;
    try {
      const selectedCompanyId = localStorage.getItem('selectedCompanyId') || '';
      await missionsApi.pause(selectedCompanyId, mission.id);
      refetch();
    } catch (err) {
      console.error("Failed to pause mission:", err);
    }
  };

  const handleResume = async () => {
    if (!mission.id) return;
    try {
      const selectedCompanyId = localStorage.getItem('selectedCompanyId') || '';
      await missionsApi.resume(selectedCompanyId, mission.id);
      refetch();
    } catch (err) {
      console.error("Failed to resume mission:", err);
    }
  };

  const handleComplete = async () => {
    if (!mission.id) return;
    try {
      const selectedCompanyId = localStorage.getItem('selectedCompanyId') || '';
      await missionsApi.complete(selectedCompanyId, mission.id);
      refetch();
    } catch (err) {
      console.error("Failed to complete mission:", err);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-5xl px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-bold">{mission.title}</h1>
            <Badge variant={getStatusVariant(mission.status)}>
              {mission.status.charAt(0).toUpperCase() + mission.status.slice(1)}
            </Badge>
          </div>
          
          {mission.description && (
            <p className="text-muted-foreground max-w-3xl">{mission.description}</p>
          )}
          
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Created {new Date(mission.createdAt).toLocaleDateString()}</span>
            </div>
            {mission.startedAt && (
              <div className="flex items-center gap-1">
                <Play className="w-3 h-3" />
                <span>
                  Started {new Date(mission.startedAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {mission.completedAt && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>
                  Completed {new Date(mission.completedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Control Buttons based on mission status */}  
        <div className="flex flex-wrap gap-2 ml-auto">
          {mission.status === "draft" && (
            <Button onClick={handleLaunch}>
              <Play className="w-4 h-4 mr-2" />
              Launch Mission
            </Button>
          )}
          
          {mission.status === "active" && (
            <>
              <Button variant="outline" onClick={handlePause}>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button variant="outline" onClick={handleComplete}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Mark Complete
              </Button>
            </>
          )}
          
          {mission.status === "paused" && (
            <>
              <Button onClick={handleResume}>
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
              <Button variant="outline" onClick={handleComplete}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Complete
              </Button>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Budget Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Coins className="w-4 h-4" />
              Budget
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {mission.budgetCapUsd 
                ? `$${mission.budgetCapUsd.toFixed(2)}`
                : "Unlimited"}
            </div>
            {mission.budgetCapUsd && typeof mission.budgetSpentUsd !== 'undefined' && (
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>${mission.budgetSpentUsd.toFixed(2)} spent</span>
                  <span>${(mission.budgetCapUsd - mission.budgetSpentUsd).toFixed(2)} remaining</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${Math.min(100, (mission.budgetSpentUsd / mission.budgetCapUsd) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {mission.budgetCapUsd && typeof mission.budgetSpentUsd === 'undefined' && (
              <div className="text-sm text-muted-foreground">
                No spending data yet
              </div>
            )}
            {!mission.budgetCapUsd && (
              <div className="text-sm text-muted-foreground/60">
                No spending cap for this mission
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Autonomy Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bot className="w-4 h-4" />
              Autonomy
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold capitalize">
              {mission.autonomyLevel}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {mission.autonomyLevel === "assisted" && "You approve deploys and major actions"}
              {mission.autonomyLevel === "copilot" && "I only approve production deploys"}
              {mission.autonomyLevel === "autopilot" && "Budget cap is my only limit"}
            </div>
          </CardContent>
        </Card>
        
        {/* Timeline Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Timeline
            </div>
          </CardHeader>
          <CardContent>
            {mission.expiresAt ? (
              <div>
                <div className="text-2xl font-semibold">
                  {Math.max(0, Math.ceil((new Date(mission.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}d
                </div>
                <div className="text-sm text-muted-foreground">
                  Until {new Date(mission.expiresAt).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-xl font-medium">No expiry set</div>
                <div className="text-sm text-muted-foreground">
                  Will run indefinitely until completed or paused
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Objectives Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Mission Objectives  
                </CardTitle>
                <span className="text-sm text-muted-foreground">
                  {completedObjectives}/{mission.objectives?.length || 0} completed
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mission.objectives && mission.objectives.length > 0 ? (
                  mission.objectives.map((objective, index) => {
                    const isCompleted = objective.toLowerCase().includes('done') || 
                                        objective.toLowerCase().includes('completed') || 
                                        objective.toLowerCase().includes('finished');
                    
                    return (
                      <div 
                        key={index} 
                        className={`
                          p-4 rounded-lg border
                          ${isCompleted ? "border-success bg-success/5" : "border-input"}
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`
                            mt-0.5 w-2 h-2 rounded-full flex-shrink-0
                            ${isCompleted ? "bg-success" : "bg-muted-foreground"}
                          `}></div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                              {objective}
                            </div>
                            
                            {/* Placeholder for progress or related actions */}  
                            {isCompleted && (
                              <div className="flex items-center mt-2 gap-2">
                                <CheckCircle2 className="w-4 h-4 text-success" />
                                <span className="text-xs text-success">Completed</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>#{index + 1}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No objectives defined yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar - Metrics & Actions */}
        <div className="space-y-6">
          {/* Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Progress</CardTitle>
            </CardHeader>
            <CardContent>
              {mission.objectives && mission.objectives.length > 0 ? (
                <div className="space-y-4">
                  <div className="w-full bg-secondary rounded-full h-3">
                    <div 
                      className="bg-primary h-3 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(100, (completedObjectives / mission.objectives.length) * 100)}%` }}
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {Math.round((completedObjectives / mission.objectives.length) * 100)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {completedObjectives} of {mission.objectives.length} objectives complete
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-2">
                  Track progress as objectives get completed
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Mission Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Related Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => navigate('/agents')}
              >
                <Bot className="w-4 h-4 mr-2" />
                View working agents
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/approvals')}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                View pending approvals
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/issues')}
              >
                <Eye className="w-4 h-4 mr-2" />
                View related tasks
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}