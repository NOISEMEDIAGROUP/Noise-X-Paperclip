import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { missionsApi } from "../api/missions";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { 
  AlertCircle,
  Bot,
  Calendar,
  Coins,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  SortAsc,
  Target
} from "lucide-react";
import type { Mission } from "../api/missions";

interface MissionCardProps {
  mission: Mission;
}

function MissionCard({ mission }: MissionCardProps) {
  const navigate = useNavigate();
  
  // Calculate progress percentage - counting objectives
  const completedObjectives = mission.objectives?.filter(obj => 
    obj.toLowerCase().includes('done') || 
    obj.toLowerCase().includes('completed') || 
    obj.toLowerCase().includes('finished')
  ).length || 0;
  
  const totalObjectives = mission.objectives?.length || 0;
  const progressPercentage = totalObjectives > 0 ? Math.round((completedObjectives / totalObjectives) * 100) : 0;
  
  // Format budget display 
  const budgetDisplay = mission.budgetCapUsd 
    ? `$${mission.budgetCapUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "Unlimited";
    
  const spentDisplay = mission.budgetSpentUsd 
    ? `$${mission.budgetSpentUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} spent`
    : null;

  // Status badge variant
  const statusVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "draft": return "secondary";
      case "paused": return "outline"; 
      case "completed": return "secondary";
      case "failed": return "destructive";
      default: return "outline";
    }
  };
  
  // Format dates
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/missions/${mission.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate">{mission.title}</CardTitle>
            {mission.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {mission.description}
              </p>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              // More options could open a dropdown menu
            }}
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Badge variant={statusVariant(mission.status)}>
              {mission.status.charAt(0).toUpperCase() + mission.status.slice(1)}
            </Badge>
            
            <div className="text-sm text-muted-foreground">
              {mission.startedAt ? (
                `Started ${formatDate(mission.startedAt)}`
              ) : mission.createdAt ? (
                `Created ${formatDate(mission.createdAt)}`
              ) : (
                "Date unknown"
              )}
            </div>
          </div>
          
          {/* Budget */}
          <div className="flex items-center gap-2 text-sm">
            <Coins className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <div>{budgetDisplay}</div>
              {spentDisplay && <div className="text-xs text-muted-foreground">{spentDisplay}</div>}
            </div>
          </div>
          
          {/* Objectives Progress */}
          {totalObjectives > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Objectives</span>
                <span>{completedObjectives}/{totalObjectives}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {/* Key Info */}
          <div className="flex gap-4 pt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Bot className="w-3 h-3" />
              <span className="truncate capitalize">{mission.autonomyLevel}</span>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Target className="w-3 h-3" />
              <span>{totalObjectives} objectives</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MissionsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); 
  const [sortBy, setSortBy] = useState("createdAt"); 
  const [sortOrder, setSortOrder] = useState("desc");
  
  // In real app, selectedCompanyId would come from context  
  const selectedCompanyId = localStorage.getItem("selectedCompanyId") || "";  

  const { 
    data: missions = [], 
    isLoading, 
    isError,
    isPending
  } = useQuery({
    queryKey: queryKeys.missions.list(selectedCompanyId),
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      return await missionsApi.list(selectedCompanyId);
    },
    enabled: !!selectedCompanyId,
  });
  
  // Filter and sort missions
  const filteredAndSortedMissions = React.useMemo(() => {
    if (!missions) return [];
    
    const filtered = filterStatus === "all" 
      ? [...missions] 
      : missions.filter(m => m.status === filterStatus);
    
    const searchFiltered = search 
      ? filtered.filter(m => 
          m.title.toLowerCase().includes(search.toLowerCase()) ||
          m.description?.toLowerCase().includes(search.toLowerCase()) ||
          m.objectives.some(o => o.toLowerCase().includes(search.toLowerCase()))
        )
      : filtered;
    
    return [...searchFiltered].sort((a, b) => {
      let valA: any, valB: any;
      
      switch (sortBy) {
        case "updatedAt": 
          valA = new Date(a.updatedAt).getTime();
          valB = new Date(b.updatedAt).getTime();
          break;
        case "startedAt": 
          valA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
          valB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
          break;
        case "expiresAt":
          valA = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
          valB = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
          break;
        case "title":
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        default: // "createdAt" or default
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
      }
      
      // Apply sort order
      if (typeof valA === 'string') {
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
    });
  }, [missions, filterStatus, search, sortBy, sortOrder]);

  if (isPending) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-8 w-64 bg-muted rounded"></div>
            <div className="h-9 w-48 bg-muted rounded"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl bg-muted h-48"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-lg mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Unable to load missions</h3>
          <p className="text-muted-foreground mb-6">
            There was an error loading your missions. Please check your internet connection and try again.
          </p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </div>
    );
  }
  
  // Count mission stats
  const activeMissions = filteredAndSortedMissions.filter(m => m.status === "active");
  const draftMissions = filteredAndSortedMissions.filter(m => m.status === "draft");  
  const completedMissions = filteredAndSortedMissions.filter(m => m.status === "completed");

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Missions</h1>
          <p className="text-muted-foreground">
            Set goals for your agents and track their progress
          </p>
        </div>
        
        <Button asChild>
          <Link to="/missions/create">
            <Plus className="w-4 h-4 mr-2" />
            New Mission
          </Link>
        </Button>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6 space-y-1">
            <div className="text-2xl font-bold">{activeMissions.length}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-1">
            <div className="text-2xl font-bold">{draftMissions.length}</div>
            <div className="text-sm text-muted-foreground">Draft</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-1">
            <div className="text-2xl font-bold">{completedMissions.length}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-1">
            <div className="text-2xl font-bold">{filteredAndSortedMissions.length}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="py-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search missions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded-md px-3 py-2 bg-background text-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="border rounded-md px-3 py-2 bg-background text-sm"
            >
              <option value="createdAt">Date Created</option>
              <option value="updatedAt">Date Updated</option>
              <option value="expiresAt">Expiry Date</option>
              <option value="title">Title</option>
            </select>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              <SortAsc className={`w-4 h-4 mr-1 transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Mission Grid */}
      {filteredAndSortedMissions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedMissions.map(mission => (
            <MissionCard key={mission.id} mission={mission} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Target className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-medium mb-2">
            {search ? "No missions match your search" : "No missions yet"}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            {search 
              ? "Try changing your search terms"
              : "Create your first mission to give agents a clear direction and goal"}
          </p>
          <Button asChild>
            <Link to="/missions/create">Create Mission</Link>
          </Button>
        </div>
      )}
    </div>
  );
}