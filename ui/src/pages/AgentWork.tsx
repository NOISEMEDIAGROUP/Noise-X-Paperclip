import { useEffect, useMemo } from "react";
import { Link } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agentsApi } from "../api/agents";
import { issuesApi } from "../api/issues";
import { heartbeatsApi } from "../api/heartbeats";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { StatusBadge } from "../components/StatusBadge";
import { agentStatusDot, agentStatusDotDefault, priorityColor, priorityColorDefault } from "../lib/status-colors";
import { relativeTime, agentUrl } from "../lib/utils";
import { PageSkeleton } from "../components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Play, Pause, Bot, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { Agent, Issue, HeartbeatRun } from "@paperclipai/shared";

interface AgentWithWork extends Agent {
  currentIssue?: Issue;
  lastRun?: {
    id: string;
    status: string;
    startedAt: string;
    finishedAt?: string;
    error?: string;
  };
}

export function AgentWork() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();

  useEffect(() => {
    setBreadcrumbs([
      { label: "Agents", href: "/agents" },
      { label: "Work" },
    ]);
  }, [setBreadcrumbs]);

  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: issues } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: runs } = useQuery({
    queryKey: queryKeys.heartbeats(selectedCompanyId!),
    queryFn: () => heartbeatsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 30000,
  });

  const triggerAgent = useMutation({
    mutationFn: ({ agentId }: { agentId: string }) =>
      agentsApi.wakeup(agentId, { triggerDetail: "manual", reason: "Manual trigger from Work Dashboard" }, selectedCompanyId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(selectedCompanyId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.liveRuns(selectedCompanyId!) });
    },
  });

  const resumeAgent = useMutation({
    mutationFn: ({ agentId }: { agentId: string }) =>
      agentsApi.update(agentId, { status: "idle" }, selectedCompanyId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(selectedCompanyId!) });
    },
  });

  const activeAgents = useMemo(() => {
    if (!agents || !issues || !runs) return [];
    
    const agentRuns = new Map<string, typeof runs[0]>();
    runs.forEach(r => {
      // Handle both Date objects and Unix timestamps (integers)
      const runTime = r.startedAt instanceof Date ? r.startedAt.getTime() : Number(r.startedAt);
      const existingRun = agentRuns.get(r.agentId);
      const existingTime = existingRun?.startedAt instanceof Date ? existingRun.startedAt.getTime() : Number(existingRun?.startedAt);
      
      if (runTime && (!existingTime || runTime > existingTime)) {
        agentRuns.set(r.agentId, r);
      }
    });

    const activeRoles = ['CEO', 'CTO', 'CPO', 'CSO', 'PM', 'BuilderEngineer', 'QAEngineer', 'ReleaseOps'];
    
    return activeRoles
      .map(role => agents.find(a => a.name === role))
      .filter(Boolean)
      .map(agent => {
        const currentIssue = issues.find(i => 
          i.assigneeAgentId === agent!.id && i.status === 'in_progress'
        );
        const lastRun = agentRuns.get(agent!.id);
        
        return {
          ...agent!,
          currentIssue,
          lastRun: lastRun ? {
            id: lastRun.id,
            status: lastRun.status,
            startedAt: lastRun.startedAt instanceof Date 
              ? lastRun.startedAt.toISOString() 
              : (lastRun.startedAt ? new Date(Number(lastRun.startedAt)).toISOString() : ''),
            finishedAt: lastRun.finishedAt instanceof Date 
              ? lastRun.finishedAt.toISOString() 
              : (lastRun.finishedAt ? new Date(Number(lastRun.finishedAt)).toISOString() : undefined),
            error: lastRun.error || undefined,
          } : undefined,
        } as AgentWithWork;
      });
  }, [agents, issues, runs]);

  if (agentsLoading || !selectedCompanyId) {
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Agent Work Center</h1>
          <p className="text-sm text-muted-foreground">
            Real-time view of all agent activity. Auto-refreshes every 30s.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {activeAgents.map((agent) => (
          <AgentWorkCard
            key={agent.id}
            agent={agent}
            onRunNow={() => triggerAgent.mutate({ agentId: agent.id })}
            onResume={() => resumeAgent.mutate({ agentId: agent.id })}
            isRunning={triggerAgent.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function AgentWorkCard({
  agent,
  onRunNow,
  onResume,
  isRunning,
}: {
  agent: AgentWithWork;
  onRunNow: () => void;
  onResume: () => void;
  isRunning: boolean;
}) {
  const isActive = agent.status === 'running' || agent.status === 'idle';
  const isPaused = agent.status === 'paused';
  const hasError = agent.status === 'error' || agent.lastRun?.status === 'failed';

  return (
    <div className={cn(
      "border rounded-lg p-4",
      isActive && "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20",
      isPaused && "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20",
      hasError && "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20",
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn(
            "mt-1 w-3 h-3 rounded-full shrink-0",
            agentStatusDot[agent.status] ?? agentStatusDotDefault
          )} />
            <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{agent.name}</h3>
              <span className="text-xs text-muted-foreground font-mono">
                {(agent.adapterConfig as Record<string, unknown>)?.MODEL_NAME as string || agent.adapterType}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {agent.lastHeartbeatAt ? relativeTime(agent.lastHeartbeatAt) : 'Never'}
              </span>
              <StatusBadge status={agent.status} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isActive && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRunNow}
              disabled={isRunning}
            >
              <Play className="h-4 w-4 mr-1" />
              Run Now
            </Button>
          )}
          {isPaused && (
            <Button
              size="sm"
              variant="outline"
              onClick={onResume}
              className="text-amber-600 border-amber-200 hover:bg-amber-50"
            >
              <Pause className="h-4 w-4 mr-1" />
              Resume
            </Button>
          )}
        </div>
      </div>

      {agent.currentIssue && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-xs text-muted-foreground mb-1">Currently Working On</div>
          <Link
            to={`/issues/${agent.currentIssue.id}`}
            className="flex items-start gap-2 group"
          >
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded shrink-0",
              priorityColor[agent.currentIssue.priority] ?? priorityColorDefault
            )}>
              {agent.currentIssue.priority || '—'}
            </span>
            <span className="font-medium group-hover:text-blue-600 transition-colors">
              {agent.currentIssue.identifier}: {agent.currentIssue.title}
            </span>
          </Link>
        </div>
      )}

      {agent.lastRun && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Last run:</span>
          {agent.lastRun.status === 'succeeded' && (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          )}
          {agent.lastRun.status === 'failed' && (
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          )}
          {agent.lastRun.status === 'running' && (
            <span className="text-blue-500">Running...</span>
          )}
          <span className={cn(
            agent.lastRun.status === 'succeeded' && "text-green-600",
            agent.lastRun.status === 'failed' && "text-red-600",
          )}>
            {agent.lastRun.status}
          </span>
          {agent.lastRun.finishedAt && (
            <span>({relativeTime(agent.lastRun.finishedAt)})</span>
          )}
        </div>
      )}

      {!agent.currentIssue && !agent.lastRun && agent.status === 'idle' && (
        <div className="mt-3 text-sm text-muted-foreground">
          No active work. Click "Run Now" to trigger heartbeat.
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}