import { eq, desc } from 'drizzle-orm';
import type { Db } from '@paperclipai/db';
import { agents, issues, heartbeatRuns } from '@paperclipai/db';

export interface AISuggestion {
  id: string;
  type: 'integration_missing' | 'bottleneck_detected' | 'optimization' | 'cost_reduction' | 'performance_improvement';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  suggestedAction: string;
  impactScore: number;
  companyId: string;
  createdAt: Date;
}

export interface ProblemDetection {
  id: string;
  type: 'agent_stuck' | 'task_blocked' | 'budget_overrun' | 'mission_stalled' | 'error_spike';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedEntities: string[];
  detectedAt: Date;
  companyId: string;
}

export interface TaskDecomposition {
  parentTask: { title: string; description?: string };
  subtasks: { title: string; description?: string; estimatedDuration?: string; dependencies?: number[] }[];
}

export function aiIntelligenceService(db: Db) {
  return {
    generateSuggestions: async (companyId: string): Promise<AISuggestion[]> => {
      const suggestions: AISuggestion[] = [];
      const timestamp = new Date();

      const agentsList = await db.select().from(agents).where(eq(agents.companyId, companyId));
      const issuesList = await db.select().from(issues).where(eq(issues.companyId, companyId));

      // Integration suggestions
      const hasGithubIntegration = agentsList.some((a: any) => 
        a.adapterConfig?.integrations?.github || a.capabilities?.includes('github')
      );
      if (!hasGithubIntegration && agentsList.length > 0) {
        suggestions.push({
          id: `sugg_gh_${Date.now()}`,
          type: 'integration_missing',
          priority: 'high',
          title: 'Missing GitHub Integration',
          description: 'Your AI agents are not connected to GitHub. Adding GitHub integration enables automated code reviews, PR management, and issue tracking.',
          suggestedAction: 'Configure GitHub integration in Settings > Integrations',
          impactScore: 85,
          companyId,
          createdAt: timestamp
        });
      }

      // Bottleneck detection
      const agentTaskCounts = new Map<string, number>();
      issuesList.forEach((issue: any) => {
        if (issue.assigneeAgentId && issue.status !== 'done' && issue.status !== 'cancelled') {
          agentTaskCounts.set(issue.assigneeAgentId, (agentTaskCounts.get(issue.assigneeAgentId) || 0) + 1);
        }
      });

      for (const [agentId, count] of agentTaskCounts.entries()) {
        if (count > 5) {
          const agent = agentsList.find((a: any) => a.id === agentId);
          suggestions.push({
            id: `sugg_bottleneck_${agentId}`,
            type: 'bottleneck_detected',
            priority: count > 10 ? 'critical' : 'high',
            title: `Agent Overload: ${agent?.name || agentId}`,
            description: `This agent has ${count} active tasks, which may cause delays and reduced quality.`,
            suggestedAction: 'Delegate tasks to other agents or pause lower-priority work',
            impactScore: Math.min(count * 8, 100),
            companyId,
            createdAt: timestamp
          });
        }
      }

      // Idle agents
      const idleAgents = agentsList.filter((a: any) => a.status === 'idle');
      if (idleAgents.length > agentsList.length * 0.3 && agentsList.length > 2) {
        suggestions.push({
          id: `sugg_idle_${Date.now()}`,
          type: 'optimization',
          priority: 'medium',
          title: 'Underutilized AI Workforce',
          description: `${idleAgents.length} out of ${agentsList.length} agents are idle. Assign more tasks to maximize productivity.`,
          suggestedAction: 'Review mission objectives and assign tasks to idle agents',
          impactScore: 60,
          companyId,
          createdAt: timestamp
        });
      }

      return suggestions;
    },

    detectProblems: async (companyId: string): Promise<ProblemDetection[]> => {
      const problems: ProblemDetection[] = [];
      const timestamp = new Date();

      const agentsList = await db.select().from(agents).where(eq(agents.companyId, companyId));
      const issuesList = await db.select().from(issues).where(eq(issues.companyId, companyId));
      const heartbeatsList = await db.select().from(heartbeatRuns)
        .where(eq(heartbeatRuns.companyId, companyId))
        .orderBy(desc(heartbeatRuns.startedAt))
        .limit(50);

      // Agent stuck detection
      const runningAgents = agentsList.filter((a: any) => a.status === 'running');
      for (const agent of runningAgents) {
        const agentRuns = heartbeatsList.filter((r: any) => r.agentId === agent.id && r.status === 'running');
        let longestRun = 0;
        for (const r of agentRuns) {
          if (r.startedAt) {
            const duration = Date.now() - new Date(r.startedAt).getTime();
            if (duration > longestRun) longestRun = duration;
          }
        }

        if (longestRun > 2 * 60 * 60 * 1000) {
          problems.push({
            id: `prob_stuck_${agent.id}`,
            type: 'agent_stuck',
            severity: 'high',
            title: `Agent Stuck: ${agent.name}`,
            description: `Agent has been running for ${Math.round(longestRun / 60 / 60 * 10) / 10} hours without completion.`,
            affectedEntities: [agent.id],
            detectedAt: timestamp,
            companyId
          });
        }
      }

      // Blocked tasks
      const blockedTasks = issuesList.filter((i: any) => i.status === 'blocked');
      if (blockedTasks.length > 0) {
        problems.push({
          id: `prob_blocked_${Date.now()}`,
          type: 'task_blocked',
          severity: blockedTasks.length > 3 ? 'high' : 'medium',
          title: `${blockedTasks.length} Blocked Task${blockedTasks.length > 1 ? 's' : ''}`,
          description: 'Tasks are blocked and require attention to unblock progress.',
          affectedEntities: blockedTasks.map((t: any) => t.id),
          detectedAt: timestamp,
          companyId
        });
      }

      // Error spike
      const errorRuns = heartbeatsList.filter((r: any) => r.status === 'failed');
      const errorRate = errorRuns.length / (heartbeatsList.length || 1);
      
      if (errorRate > 0.3) {
        problems.push({
          id: `prob_errors_${Date.now()}`,
          type: 'error_spike',
          severity: 'critical',
          title: 'High Error Rate Detected',
          description: `${Math.round(errorRate * 100)}% of recent agent runs have failed.`,
          affectedEntities: [...new Set(errorRuns.map((r: any) => r.agentId))],
          detectedAt: timestamp,
          companyId
        });
      }

      return problems;
    },

    decomposeTask: async (title: string, description?: string): Promise<TaskDecomposition> => {
      const keywords = title.toLowerCase();
      
      if (keywords.includes('feature') || keywords.includes('implement')) {
        return {
          parentTask: { title, description },
          subtasks: [
            { title: 'Analyze requirements', estimatedDuration: '2h' },
            { title: 'Set up environment', estimatedDuration: '1h' },
            { title: 'Implement core functionality', estimatedDuration: '4h' },
            { title: 'Write tests', estimatedDuration: '2h' },
            { title: 'Code review', estimatedDuration: '1h' },
            { title: 'Integration testing', estimatedDuration: '2h' },
            { title: 'Documentation', estimatedDuration: '1h' }
          ]
        };
      }

      if (keywords.includes('bug') || keywords.includes('fix')) {
        return {
          parentTask: { title, description },
          subtasks: [
            { title: 'Reproduce bug', estimatedDuration: '1h' },
            { title: 'Identify root cause', estimatedDuration: '2h' },
            { title: 'Implement fix', estimatedDuration: '2h' },
            { title: 'Write regression tests', estimatedDuration: '1h' },
            { title: 'Verify in staging', estimatedDuration: '1h' },
            { title: 'Deploy and monitor', estimatedDuration: '1h' }
          ]
        };
      }

      return {
        parentTask: { title, description },
        subtasks: [
          { title: 'Analyze requirements', estimatedDuration: '1h' },
          { title: 'Plan approach', estimatedDuration: '1h' },
          { title: 'Execute', estimatedDuration: '4h' },
          { title: 'Test', estimatedDuration: '2h' },
          { title: 'Document', estimatedDuration: '1h' }
        ]
      };
    },

    getInsights: async (companyId: string) => {
      const service = aiIntelligenceService(db);
      const [suggestions, problems] = await Promise.all([
        service.generateSuggestions(companyId),
        service.detectProblems(companyId)
      ]);

      return {
        suggestions,
        problems,
        summary: {
          totalSuggestions: suggestions.length,
          criticalProblems: problems.filter((p: ProblemDetection) => p.severity === 'critical').length,
          highPrioritySuggestions: suggestions.filter((s: AISuggestion) => s.priority === 'high' || s.priority === 'critical').length
        }
      };
    }
  };
}
