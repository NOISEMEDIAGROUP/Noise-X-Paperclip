import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProjectProfile, ProjectIntegration, ProjectScraper } from "@paperclipai/shared";
import { projectProfilesApi } from "../api/project-profiles";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Globe,
  Database,
  Server,
  Smartphone,
  Plug,
  Radio,
  Trash2,
  User,
  Building,
  Layers,
  BarChart3,
} from "lucide-react";

/* ── Helpers ── */

function PropertyRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="text-sm mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] font-medium",
        variant === "success" && "bg-green-500/10 text-green-600",
        variant === "warning" && "bg-amber-500/10 text-amber-600",
        variant === "default" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function PhaseBadge({ phase }: { phase: string }) {
  const variant = phase === "production" ? "success" : phase === "beta" ? "warning" : "default";
  return <Badge variant={variant}>{phase}</Badge>;
}

function KpiChip({ label, value }: { label: string; value: number | undefined }) {
  if (value === undefined || value === null) return null;
  return (
    <div className="flex flex-col items-center rounded border border-border px-3 py-2">
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

/* ── Sub-sections ── */

function CustomerSection({ profile }: { profile: ProjectProfile }) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Customer</h4>
      {profile.customerName && (
        <PropertyRow label="Company" icon={Building}>{profile.customerName}</PropertyRow>
      )}
      {profile.customerContact && (
        <PropertyRow label="Contact" icon={User}>{profile.customerContact}</PropertyRow>
      )}
      {profile.businessModel && (
        <PropertyRow label="Business Model" icon={Layers}>{profile.businessModel}</PropertyRow>
      )}
      <PropertyRow label="Phase">
        <PhaseBadge phase={profile.phase} />
      </PropertyRow>
    </div>
  );
}

function DeploymentSection({ profile }: { profile: ProjectProfile }) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Deployment</h4>
      {profile.productionUrl && (
        <PropertyRow label="Production URL" icon={Globe}>
          <a
            href={`https://${profile.productionUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-500 hover:underline"
          >
            {profile.productionUrl}
            <ExternalLink className="h-3 w-3" />
          </a>
        </PropertyRow>
      )}
      {profile.hostPort && (
        <PropertyRow label="Port" icon={Server}>{profile.hostPort}</PropertyRow>
      )}
      {profile.vpsDirectory && (
        <PropertyRow label="VPS Directory" icon={Server}>
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{profile.vpsDirectory}</code>
        </PropertyRow>
      )}
      {profile.dbSchema && (
        <PropertyRow label="DB Schema" icon={Database}>
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{profile.dbSchema}</code>
        </PropertyRow>
      )}
    </div>
  );
}

function TechStackSection({ profile }: { profile: ProjectProfile }) {
  if (!profile.techStack) return null;
  const { framework, runtime, css, stateManagement, orm, additionalLibs } = profile.techStack;
  const badges = [framework, runtime, css, stateManagement, orm, ...(additionalLibs ?? [])].filter(Boolean);
  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Tech Stack</h4>
      <div className="flex flex-wrap gap-1.5">
        {badges.map((b, i) => (
          <Badge key={i}>{b}</Badge>
        ))}
      </div>
    </div>
  );
}

function ModuleStatsSection({ profile }: { profile: ProjectProfile }) {
  if (!profile.moduleStats) return null;
  const s = profile.moduleStats;
  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Module Stats</h4>
      <div className="flex flex-wrap gap-2">
        <KpiChip label="Pages" value={s.pages} />
        <KpiChip label="API Endpoints" value={s.apiEndpoints} />
        <KpiChip label="Hooks" value={s.hooks} />
        <KpiChip label="Queries" value={s.queries} />
        <KpiChip label="Parsers" value={s.parsers} />
        <KpiChip label="Schemas" value={s.schemas} />
      </div>
    </div>
  );
}

function IosSection({ profile }: { profile: ProjectProfile }) {
  if (!profile.iosCompanion) return null;
  const ios = profile.iosCompanion;
  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">iOS Companion</h4>
      <div className="flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{ios.repoName}</span>
        <Badge>{ios.framework}</Badge>
        {ios.minVersion && <Badge>{ios.minVersion}</Badge>}
      </div>
    </div>
  );
}

function IntegrationsSection({
  integrations,
  projectId,
  onRemove,
}: {
  integrations: ProjectIntegration[];
  projectId: string;
  onRemove: (id: string) => void;
}) {
  if (integrations.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Integrations</h4>
      <div className="space-y-1">
        {integrations.map((i) => (
          <div key={i.id} className="flex items-center justify-between gap-2 rounded border border-border px-3 py-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <Plug className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{i.name}</span>
              <Badge>{i.integrationType}</Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => onRemove(i.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScrapersSection({
  scrapers,
  projectId,
  onRemove,
}: {
  scrapers: ProjectScraper[];
  projectId: string;
  onRemove: (id: string) => void;
}) {
  if (scrapers.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Scrapers</h4>
      <div className="space-y-1">
        {scrapers.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-2 rounded border border-border px-3 py-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <Radio className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{s.name}</span>
              {s.port && <Badge>:{s.port}</Badge>}
              {s.vpsDirectory && (
                <code className="text-[10px] text-muted-foreground bg-muted px-1 rounded hidden sm:inline">
                  {s.vpsDirectory}
                </code>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => onRemove(s.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ── */

export function ProjectProfilePanel({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: queryKeys.projects.profile(projectId),
    queryFn: () => projectProfilesApi.get(projectId),
    retry: false,
  });

  const removeIntegrationMutation = useMutation({
    mutationFn: (integrationId: string) =>
      projectProfilesApi.removeIntegration(projectId, integrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.profile(projectId) });
    },
  });

  const removeScraperMutation = useMutation({
    mutationFn: (scraperId: string) =>
      projectProfilesApi.removeScraper(projectId, scraperId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.profile(projectId) });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-6 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-6 text-center text-muted-foreground text-sm">
        <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No project profile configured.</p>
        <p className="text-xs mt-1">Use the API to create a profile for this project.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      <CustomerSection profile={profile} />
      <Separator />
      <DeploymentSection profile={profile} />
      <Separator />
      <TechStackSection profile={profile} />
      {profile.techStack && <Separator />}
      <ModuleStatsSection profile={profile} />
      {profile.moduleStats && <Separator />}
      <IosSection profile={profile} />
      {profile.iosCompanion && <Separator />}
      <IntegrationsSection
        integrations={profile.integrations}
        projectId={projectId}
        onRemove={(id) => removeIntegrationMutation.mutate(id)}
      />
      {profile.integrations.length > 0 && <Separator />}
      <ScrapersSection
        scrapers={profile.scrapers}
        projectId={projectId}
        onRemove={(id) => removeScraperMutation.mutate(id)}
      />
    </div>
  );
}
