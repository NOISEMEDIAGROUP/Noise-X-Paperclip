import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@/lib/router";
import { projectsApi } from "../api/projects";
import { issuesApi } from "../api/issues";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { PageSkeleton } from "../components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { useDialog } from "@/context/DialogContext";
import {
  Plus,
  LayoutGrid,
  ChevronRight,
  ChevronDown,
  Circle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Layers,
  BarChart3,
  CalendarDays,
  Target,
} from "lucide-react";
import type { Project, Issue } from "@paperclipai/shared";

/* ── Helpers ── */

const STATUS_ORDER = ["in_progress", "in_review", "blocked", "todo", "backlog", "done", "cancelled"];

function statusColor(status: string): string {
  switch (status) {
    case "done": return "#22c55e";
    case "in_progress": return "#3b82f6";
    case "blocked": return "#ef4444";
    case "in_review": return "#a855f7";
    case "todo": return "#eab308";
    case "backlog": return "#9ca3af";
    case "cancelled": return "#6b7280";
    default: return "#9ca3af";
  }
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function StatusDot({ status }: { status: string }) {
  switch (status) {
    case "done": return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
    case "in_progress": return <Clock className="w-3.5 h-3.5 text-blue-500" />;
    case "blocked": return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
    case "in_review": return <Circle className="w-3.5 h-3.5 text-purple-500" />;
    default: return <Circle className="w-3.5 h-3.5 text-muted-foreground/50" />;
  }
}

const PROJECT_FALLBACK_COLOR = "#6366f1";
const LABEL_COL_W = 220; // px — left label column
const ROW_H = 52;        // px per project row
const TODAY_OVERHANG_DAYS = 14; // days of padding after today on the right

interface ProjectRow {
  project: Project;
  issues: Issue[];
  start: Date;
  end: Date;
  progress: number; // 0–100
  done: number;
  total: number;
  statusBreakdown: Record<string, number>;
}

/* ── Timeline bar component ── */

function TimelineBar({
  row,
  timelineStart,
  timelineEnd,
  totalPx,
}: {
  row: ProjectRow;
  timelineStart: Date;
  timelineEnd: Date;
  totalPx: number;
}) {
  const totalMs = timelineEnd.getTime() - timelineStart.getTime();
  const color = row.project.color ?? PROJECT_FALLBACK_COLOR;

  const leftPct = Math.max(0, (row.start.getTime() - timelineStart.getTime()) / totalMs) * 100;
  const rightPct = Math.min(100, (row.end.getTime() - timelineStart.getTime()) / totalMs) * 100;
  const widthPct = Math.max(rightPct - leftPct, 1);

  const progressWidth = `${row.progress}%`;

  // Today marker position
  const now = new Date();
  const todayPct = Math.max(0, Math.min(100,
    (now.getTime() - timelineStart.getTime()) / totalMs * 100
  ));

  return (
    <div className="relative" style={{ height: ROW_H }}>
      {/* today line */}
      <div
        className="absolute top-0 bottom-0 w-px bg-red-400/70 z-10 pointer-events-none"
        style={{ left: `${todayPct}%` }}
      />
      {/* bar */}
      <div
        className="absolute top-1/2 -translate-y-1/2 rounded-md overflow-hidden"
        style={{
          left: `${leftPct}%`,
          width: `${widthPct}%`,
          height: 28,
          backgroundColor: `${color}30`,
          border: `1.5px solid ${color}80`,
        }}
      >
        {/* progress fill */}
        <div
          className="h-full rounded-md transition-all duration-700"
          style={{ width: progressWidth, backgroundColor: `${color}70` }}
        />
        {/* label inside bar */}
        <div
          className="absolute inset-0 flex items-center px-2 gap-1.5 overflow-hidden"
          style={{ color }}
        >
          <span className="text-[11px] font-semibold truncate leading-none">
            {row.project.name}
          </span>
          <span className="text-[10px] font-medium opacity-80 shrink-0 ml-auto">
            {row.progress}%
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */

export function Roadmap() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { openNewIssue } = useDialog();
  const navigate = useNavigate();

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    setBreadcrumbs([{ label: "Roadmap" }]);
  }, [setBreadcrumbs]);

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: issues } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  /* ── Aggregate per-project rows ── */
  const projectRows = useMemo((): ProjectRow[] => {
    if (!projects || !issues) return [];

    return projects
      .filter(p => !p.archivedAt)
      .map(project => {
        const projectIssues = issues.filter(i => i.projectId === project.id);
        const done = projectIssues.filter(i => i.status === "done").length;
        const total = projectIssues.length;
        const progress = total > 0 ? Math.round((done / total) * 100) : 0;

        const statusBreakdown: Record<string, number> = {};
        for (const issue of projectIssues) {
          statusBreakdown[issue.status] = (statusBreakdown[issue.status] ?? 0) + 1;
        }

        // Timeline span: project createdAt → targetDate (or last issue updatedAt, or +90 days)
        const start = new Date(project.createdAt);
        let end: Date;
        if (project.targetDate) {
          end = new Date(project.targetDate);
        } else if (projectIssues.length > 0) {
          const latestIssue = projectIssues.reduce((a, b) =>
            new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b
          );
          end = new Date(latestIssue.updatedAt);
          // Add 14 days buffer
          end.setDate(end.getDate() + 14);
        } else {
          end = new Date(start);
          end.setDate(end.getDate() + 90);
        }

        // Clamp: end must be after start
        if (end <= start) {
          end = new Date(start);
          end.setDate(end.getDate() + 30);
        }

        return {
          project,
          issues: [...projectIssues].sort((a, b) =>
            STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
          ),
          start,
          end,
          progress,
          done,
          total,
          statusBreakdown,
        };
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [projects, issues]);

  /* ── Timeline bounds ── */
  const { timelineStart, timelineEnd } = useMemo(() => {
    if (projectRows.length === 0) {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      const end = new Date(now);
      end.setDate(end.getDate() + 60);
      return { timelineStart: start, timelineEnd: end };
    }

    const earliest = projectRows.reduce((a, b) => a.start < b.start ? a : b).start;
    const latest = projectRows.reduce((a, b) => a.end > b.end ? a : b).end;

    const tStart = new Date(earliest);
    tStart.setDate(tStart.getDate() - 7);

    const tEnd = new Date(Math.max(latest.getTime(), new Date().getTime()));
    tEnd.setDate(tEnd.getDate() + TODAY_OVERHANG_DAYS);

    return { timelineStart: tStart, timelineEnd: tEnd };
  }, [projectRows]);

  /* ── Summary stats ── */
  const stats = useMemo(() => {
    if (!issues || !projects) return { totalProjects: 0, total: 0, done: 0, inProgress: 0, blocked: 0 };
    return {
      totalProjects: projects.filter(p => !p.archivedAt).length,
      total: issues.length,
      done: issues.filter(i => i.status === "done").length,
      inProgress: issues.filter(i => i.status === "in_progress").length,
      blocked: issues.filter(i => i.status === "blocked").length,
    };
  }, [issues, projects]);

  /* ── Month tick marks ── */
  const monthTicks = useMemo(() => {
    const ticks: { label: string; pct: number }[] = [];
    const totalMs = timelineEnd.getTime() - timelineStart.getTime();
    const cursor = new Date(timelineStart);
    cursor.setDate(1);
    cursor.setMonth(cursor.getMonth() + 1);
    while (cursor <= timelineEnd) {
      const pct = ((cursor.getTime() - timelineStart.getTime()) / totalMs) * 100;
      ticks.push({
        label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        pct,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return ticks;
  }, [timelineStart, timelineEnd]);

  const todayPct = useMemo(() => {
    const totalMs = timelineEnd.getTime() - timelineStart.getTime();
    return Math.max(0, Math.min(100,
      (new Date().getTime() - timelineStart.getTime()) / totalMs * 100
    ));
  }, [timelineStart, timelineEnd]);

  const toggleExpand = (id: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Guards ── */
  if (!selectedCompanyId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Select a company to view the roadmap.</p>
      </div>
    );
  }

  if (projectsLoading) {
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 min-w-[900px]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Roadmap</h1>
            <p className="text-sm text-muted-foreground">Project timeline and progress overview</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/kanban")}>
              <LayoutGrid className="w-4 h-4 mr-2" />
              Board
            </Button>
            <Button size="sm" onClick={() => openNewIssue()}>
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>

        {/* ── Stats cards ── */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Layers className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Projects</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Total Tasks</span>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-card border rounded-lg p-4 border-green-500/20">
            <div className="flex items-center gap-2 text-green-500 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Completed</span>
            </div>
            <div className="text-2xl font-bold text-green-500">{stats.done}</div>
          </div>
          <div className="bg-card border rounded-lg p-4 border-blue-500/20">
            <div className="flex items-center gap-2 text-blue-500 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">In Progress</span>
            </div>
            <div className="text-2xl font-bold text-blue-500">{stats.inProgress}</div>
          </div>
        </div>

        {projectRows.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No active projects. Create a project to see it on the roadmap.</p>
          </div>
        ) : (
          /* ── Timeline table ── */
          <div className="border rounded-lg overflow-hidden bg-card">

            {/* Column header: month ticks */}
            <div className="flex border-b bg-muted/30">
              {/* left label col */}
              <div
                className="shrink-0 border-r px-3 py-2 flex items-center"
                style={{ width: LABEL_COL_W }}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Project
                </span>
              </div>
              {/* timeline header */}
              <div className="flex-1 relative h-8 overflow-hidden">
                {monthTicks.map(tick => (
                  <div
                    key={tick.label}
                    className="absolute top-0 bottom-0 flex flex-col justify-center"
                    style={{ left: `${tick.pct}%` }}
                  >
                    <div className="w-px h-full bg-border/50 absolute left-0" />
                    <span className="text-[10px] text-muted-foreground/70 pl-1.5 leading-none select-none">
                      {tick.label}
                    </span>
                  </div>
                ))}
                {/* Today label */}
                <div
                  className="absolute top-0 bottom-0 flex flex-col justify-center pointer-events-none"
                  style={{ left: `${todayPct}%` }}
                >
                  <div className="w-px h-full bg-red-400/70 absolute left-0" />
                  <span className="text-[10px] font-semibold text-red-400 pl-1.5 leading-none bg-card/80 select-none">
                    Today
                  </span>
                </div>
              </div>
            </div>

            {/* Project rows */}
            {projectRows.map(row => {
              const color = row.project.color ?? PROJECT_FALLBACK_COLOR;
              const isExpanded = expandedProjects.has(row.project.id);
              const activeStatuses = Object.entries(row.statusBreakdown)
                .filter(([, n]) => n > 0)
                .sort(([a], [b]) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b));

              return (
                <div key={row.project.id} className="border-b last:border-b-0">
                  {/* Main row */}
                  <div className="flex hover:bg-muted/20 transition-colors">
                    {/* Label column */}
                    <div
                      className="shrink-0 border-r px-3 flex items-center gap-2"
                      style={{ width: LABEL_COL_W, height: ROW_H }}
                    >
                      {/* colour swatch */}
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/projects/${row.project.urlKey}/issues`}
                          className="text-sm font-medium truncate block hover:underline"
                        >
                          {row.project.name}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-14 h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${row.progress}%`, backgroundColor: color }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {row.done}/{row.total}
                          </span>
                        </div>
                      </div>
                      <button
                        className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
                        onClick={() => toggleExpand(row.project.id)}
                      >
                        {isExpanded
                          ? <ChevronDown className="w-3.5 h-3.5" />
                          : <ChevronRight className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>

                    {/* Timeline bar column */}
                    <div className="flex-1 relative">
                      <TimelineBar
                        row={row}
                        timelineStart={timelineStart}
                        timelineEnd={timelineEnd}
                        totalPx={0}
                      />
                    </div>
                  </div>

                  {/* Expanded: status breakdown chips + issue list */}
                  {isExpanded && (
                    <div
                      className="border-t bg-muted/10"
                      style={{ marginLeft: LABEL_COL_W }}
                    >
                      {/* Status breakdown */}
                      {activeStatuses.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap px-4 py-2 border-b border-dashed">
                          {activeStatuses.map(([status, count]) => (
                            <span
                              key={status}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{
                                backgroundColor: `${statusColor(status)}20`,
                                color: statusColor(status),
                                border: `1px solid ${statusColor(status)}40`,
                              }}
                            >
                              {statusLabel(status)} · {count}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Issues list */}
                      {row.issues.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-muted-foreground">
                          No tasks in this project
                        </div>
                      ) : (
                        <div className="divide-y divide-border/50 max-h-60 overflow-y-auto">
                          {row.issues.map(issue => (
                            <Link
                              key={issue.id}
                              to={`/issues/${issue.identifier ?? issue.id}`}
                              className="flex items-center gap-2.5 px-4 py-2 hover:bg-muted/40 transition-colors group/issue"
                            >
                              <StatusDot status={issue.status} />
                              <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-14">
                                {issue.identifier ?? issue.id.slice(0, 8)}
                              </span>
                              <span className="flex-1 text-xs truncate">{issue.title}</span>
                              <span
                                className="text-[10px] shrink-0"
                                style={{ color: statusColor(issue.status) }}
                              >
                                {statusLabel(issue.status)}
                              </span>
                              <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover/issue:opacity-100 transition-opacity shrink-0" />
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Target date */}
                      {row.project.targetDate && (
                        <div className="flex items-center gap-1.5 px-4 py-2 border-t border-dashed text-xs text-muted-foreground">
                          <CalendarDays className="w-3.5 h-3.5" />
                          <span>Target: {new Date(row.project.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Timeline footer: today label */}
            <div className="flex border-t bg-muted/20">
              <div className="shrink-0" style={{ width: LABEL_COL_W }} />
              <div className="flex-1 relative h-6">
                <div
                  className="absolute top-0 bottom-0 flex items-center pointer-events-none"
                  style={{ left: `${todayPct}%` }}
                >
                  <div className="w-px h-full bg-red-400/70 absolute left-0" />
                  <span className="text-[9px] font-medium text-red-400/70 pl-1">
                    {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
