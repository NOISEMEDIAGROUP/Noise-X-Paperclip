import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProjectWorkspace, GitFileStatus } from "@paperclipai/shared";
import { gitApi } from "../api/git";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GitBranch,
  RefreshCw,
  RotateCcw,
  Upload,
  Download,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  Archive,
  Check,
  AlertTriangle,
} from "lucide-react";

function statusLabel(f: GitFileStatus): string {
  if (f.index === "?" && f.workingDir === "?") return "untracked";
  if (f.index === "A") return "added";
  if (f.index === "D" || f.workingDir === "D") return "deleted";
  if (f.index === "R") return "renamed";
  if (f.index === "M" || f.workingDir === "M") return "modified";
  return "changed";
}

function statusColor(label: string): string {
  switch (label) {
    case "untracked":
      return "text-blue-400";
    case "added":
      return "text-green-400";
    case "deleted":
      return "text-red-400";
    case "modified":
      return "text-yellow-400";
    case "renamed":
      return "text-purple-400";
    default:
      return "text-muted-foreground";
  }
}

export function WorkspaceGitControl({
  workspace,
  compact = false,
}: {
  workspace: ProjectWorkspace;
  compact?: boolean;
}) {
  const queryClient = useQueryClient();
  const [filesExpanded, setFilesExpanded] = useState(true);
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [stashDialogOpen, setStashDialogOpen] = useState(false);
  const [stashMessage, setStashMessage] = useState("");
  const [logExpanded, setLogExpanded] = useState(false);

  const wId = workspace.id;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.git.status(wId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.git.log(wId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.git.branches(wId) });
  };

  const { data: status, isLoading, error } = useQuery({
    queryKey: queryKeys.git.status(wId),
    queryFn: () => gitApi.status(wId),
    refetchInterval: 10_000,
  });

  const { data: logData } = useQuery({
    queryKey: queryKeys.git.log(wId),
    queryFn: () => gitApi.log(wId, 10),
    enabled: logExpanded,
  });

  const fetchMutation = useMutation({
    mutationFn: () => gitApi.fetch(wId),
    onSuccess: invalidateAll,
  });

  const pullMutation = useMutation({
    mutationFn: () => gitApi.pull(wId),
    onSuccess: invalidateAll,
  });

  const pushMutation = useMutation({
    mutationFn: () => gitApi.push(wId, !status?.branch?.tracking),
    onSuccess: invalidateAll,
  });

  const commitMutation = useMutation({
    mutationFn: (message: string) => gitApi.commit(wId, message),
    onSuccess: () => {
      setCommitDialogOpen(false);
      setCommitMessage("");
      invalidateAll();
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => gitApi.resetToRemote(wId),
    onSuccess: () => {
      setResetDialogOpen(false);
      invalidateAll();
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: (name: string) => gitApi.createBranch(wId, name),
    onSuccess: () => {
      setBranchDialogOpen(false);
      setBranchName("");
      invalidateAll();
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (branch: string) => gitApi.checkout(wId, branch),
    onSuccess: invalidateAll,
  });

  const discardFileMutation = useMutation({
    mutationFn: (path: string) => gitApi.discardFile(wId, path),
    onSuccess: invalidateAll,
  });

  const stashMutation = useMutation({
    mutationFn: (message?: string) => gitApi.stash(wId, message),
    onSuccess: () => {
      setStashDialogOpen(false);
      setStashMessage("");
      invalidateAll();
    },
  });

  const stashPopMutation = useMutation({
    mutationFn: () => gitApi.stashPop(wId),
    onSuccess: invalidateAll,
  });

  if (!workspace.cwd) {
    return (
      <div className="text-sm text-muted-foreground px-3 py-2">
        No local directory configured for this workspace.
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground px-3 py-4">Loading git status...</div>;
  }

  if (error) {
    return (
      <div className="text-sm text-destructive px-3 py-4">
        Failed to load git status: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  if (!status?.isRepo) {
    return (
      <div className="text-sm text-muted-foreground px-3 py-4">
        <code className="text-xs bg-muted/50 px-1 py-0.5 rounded">{workspace.cwd}</code> is not a git repository.
      </div>
    );
  }

  const anyPending =
    fetchMutation.isPending ||
    pullMutation.isPending ||
    pushMutation.isPending ||
    commitMutation.isPending ||
    resetMutation.isPending ||
    createBranchMutation.isPending ||
    checkoutMutation.isPending;

  return (
    <div className="space-y-3">
      {/* Branch info */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm">
          <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{status.branch?.current ?? "detached"}</span>
        </div>

        {status.branch?.tracking && (
          <Badge variant="outline" className="text-[10px] font-normal">
            {status.branch.tracking}
          </Badge>
        )}

        {(status.branch?.ahead ?? 0) > 0 && (
          <Badge variant="secondary" className="text-[10px] font-normal text-green-400">
            +{status.branch!.ahead} ahead
          </Badge>
        )}
        {(status.branch?.behind ?? 0) > 0 && (
          <Badge variant="secondary" className="text-[10px] font-normal text-yellow-400">
            -{status.branch!.behind} behind
          </Badge>
        )}

        {status.changedCount > 0 && (
          <Badge variant="secondary" className="text-[10px] font-normal">
            {status.changedCount} changed
          </Badge>
        )}

        {status.changedCount === 0 && (
          <Badge variant="secondary" className="text-[10px] font-normal text-green-400">
            <Check className="h-2.5 w-2.5 mr-0.5" />
            clean
          </Badge>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => fetchMutation.mutate()}
          disabled={anyPending}
        >
          <RefreshCw className={`h-3 w-3 ${fetchMutation.isPending ? "animate-spin" : ""}`} />
          Fetch
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => pullMutation.mutate()}
          disabled={anyPending}
        >
          <Download className="h-3 w-3" />
          Pull
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => pushMutation.mutate()}
          disabled={anyPending}
        >
          <Upload className="h-3 w-3" />
          Push
        </Button>

        {status.changedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setCommitDialogOpen(true)}
            disabled={anyPending}
          >
            <Check className="h-3 w-3" />
            Commit
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setBranchDialogOpen(true)}
          disabled={anyPending}
        >
          <Plus className="h-3 w-3" />
          Branch
        </Button>

        {status.changedCount > 0 && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setStashDialogOpen(true)}
              disabled={anyPending}
            >
              <Archive className="h-3 w-3" />
              Stash
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
              onClick={() => setResetDialogOpen(true)}
              disabled={anyPending}
            >
              <RotateCcw className="h-3 w-3" />
              Reset to Remote
            </Button>
          </>
        )}

        {status.changedCount === 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => stashPopMutation.mutate()}
            disabled={anyPending || stashPopMutation.isPending}
          >
            <Archive className="h-3 w-3" />
            Stash Pop
          </Button>
        )}
      </div>

      {/* Branch switcher (inline) */}
      {status.branch && status.branch.branches.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">Switch:</span>
          {status.branch.branches
            .filter((b) => b !== status.branch?.current)
            .slice(0, 8)
            .map((b) => (
              <button
                key={b}
                className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border border-border hover:bg-accent/30 transition-colors"
                onClick={() => checkoutMutation.mutate(b)}
                disabled={anyPending}
              >
                {b}
              </button>
            ))}
        </div>
      )}

      {/* Changed files */}
      {status.changedCount > 0 && (
        <div>
          <button
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setFilesExpanded(!filesExpanded)}
          >
            {filesExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Changed files ({status.changedCount})
          </button>

          {filesExpanded && (
            <div className="mt-1.5 rounded-md border border-border divide-y divide-border max-h-64 overflow-y-auto">
              {status.files.map((f) => {
                const label = statusLabel(f);
                return (
                  <div
                    key={f.path}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-accent/30 transition-colors group"
                  >
                    <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="flex-1 min-w-0 truncate font-mono">{f.path}</span>
                    <span className={`shrink-0 text-[10px] ${statusColor(label)}`}>{label}</span>
                    <button
                      className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-0.5"
                      title={`Discard changes to ${f.path}`}
                      onClick={() => {
                        if (confirm(`Discard changes to ${f.path}?`)) {
                          discardFileMutation.mutate(f.path);
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Recent commits (collapsible) */}
      {!compact && (
        <div>
          <button
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setLogExpanded(!logExpanded)}
          >
            {logExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Recent commits
          </button>

          {logExpanded && logData && (
            <div className="mt-1.5 rounded-md border border-border divide-y divide-border max-h-48 overflow-y-auto">
              {logData.map((entry) => (
                <div key={entry.hash} className="px-2.5 py-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <code className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {entry.hashShort}
                    </code>
                    <span className="flex-1 min-w-0 truncate">{entry.message}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {entry.author} &middot; {new Date(entry.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Commit dialog */}
      <Dialog open={commitDialogOpen} onOpenChange={setCommitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Commit Changes</DialogTitle>
          </DialogHeader>
          <div className="px-4 py-3 space-y-3">
            <div className="text-xs text-muted-foreground">
              {status.changedCount} file{status.changedCount !== 1 ? "s" : ""} will be staged and committed.
            </div>
            <textarea
              className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              rows={3}
              placeholder="Commit message..."
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && commitMessage.trim()) {
                  commitMutation.mutate(commitMessage.trim());
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setCommitDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => commitMutation.mutate(commitMessage.trim())}
              disabled={!commitMessage.trim() || commitMutation.isPending}
            >
              {commitMutation.isPending ? "Committing..." : "Commit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New branch dialog */}
      <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Create Branch</DialogTitle>
          </DialogHeader>
          <div className="px-4 py-3">
            <input
              className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Branch name..."
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && branchName.trim()) {
                  createBranchMutation.mutate(branchName.trim());
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setBranchDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => createBranchMutation.mutate(branchName.trim())}
              disabled={!branchName.trim() || createBranchMutation.isPending}
            >
              {createBranchMutation.isPending ? "Creating..." : "Create & Switch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset confirmation dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Reset to Remote
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 py-3 space-y-2">
            <p className="text-sm text-muted-foreground">
              This will <strong className="text-foreground">permanently discard</strong> all local changes
              and reset to the remote tracking branch.
            </p>
            <p className="text-sm text-muted-foreground">
              {status.changedCount} file{status.changedCount !== 1 ? "s" : ""} will be lost.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? "Resetting..." : "Reset to Remote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stash dialog */}
      <Dialog open={stashDialogOpen} onOpenChange={setStashDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Stash Changes</DialogTitle>
          </DialogHeader>
          <div className="px-4 py-3">
            <input
              className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Stash message (optional)..."
              value={stashMessage}
              onChange={(e) => setStashMessage(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  stashMutation.mutate(stashMessage.trim() || undefined);
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setStashDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => stashMutation.mutate(stashMessage.trim() || undefined)}
              disabled={stashMutation.isPending}
            >
              {stashMutation.isPending ? "Stashing..." : "Stash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
