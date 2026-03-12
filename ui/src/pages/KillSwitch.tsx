import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { killSwitchApi } from "../api/kill-switch";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ShieldOff, OctagonX, Power, Loader2 } from "lucide-react";
import type { KillSwitchProcessInfo } from "@paperclipai/shared";

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  isPending,
  isError,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  isPending: boolean;
  isError: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="p-0 gap-0 sm:max-w-md">
        <div className="px-4 py-4 space-y-3">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          {isError && (
            <p className="text-xs text-destructive">Operation failed.</p>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-border">
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Working...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProcessRow({ process }: { process: KillSwitchProcessInfo }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 text-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{process.agentName}</span>
          <Badge
            variant={process.status === "running" ? "default" : "secondary"}
            className="text-[10px] font-normal"
          >
            {process.status}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          <span className="font-mono">{process.runId.slice(0, 8)}</span>
          {process.pid && <span>PID {process.pid}</span>}
          {process.startedAt && (
            <span>{new Date(process.startedAt).toLocaleTimeString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function KillSwitch() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();

  const [killAllOpen, setKillAllOpen] = useState(false);
  const [shutdownOpen, setShutdownOpen] = useState(false);

  useEffect(() => {
    setBreadcrumbs([{ label: "Kill Switch" }]);
  }, [setBreadcrumbs]);

  const { data: status, isLoading } = useQuery({
    queryKey: queryKeys.killSwitch.status(selectedCompanyId!),
    queryFn: () => killSwitchApi.status(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 3000,
  });

  const killAllMutation = useMutation({
    mutationFn: () => killSwitchApi.killAll(selectedCompanyId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.killSwitch.status(selectedCompanyId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.liveRuns(selectedCompanyId!) });
      setKillAllOpen(false);
    },
  });

  const shutdownMutation = useMutation({
    mutationFn: () => killSwitchApi.shutdown(),
  });

  if (!selectedCompanyId) {
    return <EmptyState icon={ShieldOff} message="Select a company to view kill switch" />;
  }

  if (isLoading) return <PageSkeleton variant="list" />;

  const processes = status?.processes ?? [];
  const hasRunning = processes.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Kill Switch</h1>
      </div>

      <div className="rounded-md border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldOff className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Emergency controls for terminating agent processes. Use when an agent is behaving unexpectedly or performing dangerous actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={!hasRunning || killAllMutation.isPending}
            onClick={() => setKillAllOpen(true)}
          >
            <OctagonX className="h-3.5 w-3.5 mr-1.5" />
            Kill All Agents
            {hasRunning && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] font-normal">
                {processes.length}
              </Badge>
            )}
          </Button>

          <Button
            variant="destructive"
            size="sm"
            className="bg-destructive/80 hover:bg-destructive"
            onClick={() => setShutdownOpen(true)}
          >
            <Power className="h-3.5 w-3.5 mr-1.5" />
            Emergency Shutdown
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-muted/20">
          <span className="text-sm font-medium">Active Processes</span>
          <Badge variant="outline" className="text-[10px] font-normal ml-auto">
            {status?.totalRunning ?? 0} running
          </Badge>
        </div>

        {processes.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            No active agent processes
          </div>
        ) : (
          <div className="divide-y divide-border">
            {processes.map((p) => (
              <ProcessRow key={p.runId} process={p} />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={killAllOpen}
        onOpenChange={setKillAllOpen}
        title="Kill All Agents"
        description={`This will immediately terminate all ${processes.length} running agent process(es) for this company. Running tasks will be cancelled.`}
        confirmLabel="Kill All"
        isPending={killAllMutation.isPending}
        isError={killAllMutation.isError}
        onConfirm={() => killAllMutation.mutate()}
      />

      <ConfirmDialog
        open={shutdownOpen}
        onOpenChange={setShutdownOpen}
        title="Emergency Shutdown"
        description="This will shut down the entire Paperclip server. All agents, the UI, and the API will stop. You will need to restart the service manually."
        confirmLabel="Shutdown Server"
        isPending={shutdownMutation.isPending}
        isError={shutdownMutation.isError}
        onConfirm={() => shutdownMutation.mutate()}
      />
    </div>
  );
}
