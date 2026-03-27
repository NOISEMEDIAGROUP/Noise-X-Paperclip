import { Link } from "@/lib/router";
import { Identity } from "./Identity";
import { timeAgo } from "../lib/timeAgo";
import { cn } from "../lib/utils";
import { isPortugueseLanguage } from "../lib/locale";
import { deriveProjectUrlKey, type ActivityEvent, type Agent } from "@paperclipai/shared";

function humanizeValue(value: unknown): string {
  if (typeof value !== "string") return String(value ?? (isPortugueseLanguage() ? "nenhum" : "none"));
  return value.replace(/_/g, " ");
}

function formatVerb(action: string, details?: Record<string, unknown> | null): string {
  const actionVerbs: Record<string, string> = isPortugueseLanguage()
    ? {
        "issue.created": "criou",
        "issue.updated": "atualizou",
        "issue.checked_out": "assumiu",
        "issue.released": "liberou",
        "issue.comment_added": "comentou em",
        "issue.attachment_added": "anexou arquivo em",
        "issue.attachment_removed": "removeu anexo de",
        "issue.document_created": "criou documento para",
        "issue.document_updated": "atualizou documento em",
        "issue.document_deleted": "removeu documento de",
        "issue.commented": "comentou em",
        "issue.deleted": "removeu",
        "agent.created": "criou",
        "agent.updated": "atualizou",
        "agent.paused": "pausou",
        "agent.resumed": "retomou",
        "agent.terminated": "encerrou",
        "agent.key_created": "criou chave de API para",
        "agent.budget_updated": "atualizou o orcamento de",
        "agent.runtime_session_reset": "reiniciou a sessao de",
        "heartbeat.invoked": "executou heartbeat para",
        "heartbeat.cancelled": "cancelou heartbeat de",
        "approval.created": "solicitou aprovacao",
        "approval.approved": "aprovou",
        "approval.rejected": "rejeitou",
        "project.created": "criou",
        "project.updated": "atualizou",
        "project.deleted": "removeu",
        "goal.created": "criou",
        "goal.updated": "atualizou",
        "goal.deleted": "removeu",
        "cost.reported": "registrou custo para",
        "cost.recorded": "registrou custo para",
        "company.created": "criou a empresa",
        "company.updated": "atualizou a empresa",
        "company.archived": "arquivou",
        "company.budget_updated": "atualizou o orcamento de",
      }
    : {
        "issue.created": "created",
        "issue.updated": "updated",
        "issue.checked_out": "checked out",
        "issue.released": "released",
        "issue.comment_added": "commented on",
        "issue.attachment_added": "attached file to",
        "issue.attachment_removed": "removed attachment from",
        "issue.document_created": "created document for",
        "issue.document_updated": "updated document on",
        "issue.document_deleted": "deleted document from",
        "issue.commented": "commented on",
        "issue.deleted": "deleted",
        "agent.created": "created",
        "agent.updated": "updated",
        "agent.paused": "paused",
        "agent.resumed": "resumed",
        "agent.terminated": "terminated",
        "agent.key_created": "created API key for",
        "agent.budget_updated": "updated budget for",
        "agent.runtime_session_reset": "reset session for",
        "heartbeat.invoked": "invoked heartbeat for",
        "heartbeat.cancelled": "cancelled heartbeat for",
        "approval.created": "requested approval",
        "approval.approved": "approved",
        "approval.rejected": "rejected",
        "project.created": "created",
        "project.updated": "updated",
        "project.deleted": "deleted",
        "goal.created": "created",
        "goal.updated": "updated",
        "goal.deleted": "deleted",
        "cost.reported": "reported cost for",
        "cost.recorded": "recorded cost for",
        "company.created": "created company",
        "company.updated": "updated company",
        "company.archived": "archived",
        "company.budget_updated": "updated budget for",
      };

  if (action === "issue.updated" && details) {
    const previous = (details._previous ?? {}) as Record<string, unknown>;
    if (details.status !== undefined) {
      const from = previous.status;
      if (isPortugueseLanguage()) {
        return from
          ? `alterou o status de ${humanizeValue(from)} para ${humanizeValue(details.status)} em`
          : `alterou o status para ${humanizeValue(details.status)} em`;
      }
      return from
        ? `changed status from ${humanizeValue(from)} to ${humanizeValue(details.status)} on`
        : `changed status to ${humanizeValue(details.status)} on`;
    }
    if (details.priority !== undefined) {
      const from = previous.priority;
      if (isPortugueseLanguage()) {
        return from
          ? `alterou a prioridade de ${humanizeValue(from)} para ${humanizeValue(details.priority)} em`
          : `alterou a prioridade para ${humanizeValue(details.priority)} em`;
      }
      return from
        ? `changed priority from ${humanizeValue(from)} to ${humanizeValue(details.priority)} on`
        : `changed priority to ${humanizeValue(details.priority)} on`;
    }
  }
  return actionVerbs[action] ?? action.replace(/[._]/g, " ");
}

function entityLink(entityType: string, entityId: string, name?: string | null): string | null {
  switch (entityType) {
    case "issue": return `/issues/${name ?? entityId}`;
    case "agent": return `/agents/${entityId}`;
    case "project": return `/projects/${deriveProjectUrlKey(name, entityId)}`;
    case "goal": return `/goals/${entityId}`;
    case "approval": return `/approvals/${entityId}`;
    default: return null;
  }
}

interface ActivityRowProps {
  event: ActivityEvent;
  agentMap: Map<string, Agent>;
  entityNameMap: Map<string, string>;
  entityTitleMap?: Map<string, string>;
  className?: string;
}

export function ActivityRow({ event, agentMap, entityNameMap, entityTitleMap, className }: ActivityRowProps) {
  const verb = formatVerb(event.action, event.details);

  const isHeartbeatEvent = event.entityType === "heartbeat_run";
  const heartbeatAgentId = isHeartbeatEvent
    ? (event.details as Record<string, unknown> | null)?.agentId as string | undefined
    : undefined;

  const name = isHeartbeatEvent
    ? (heartbeatAgentId ? entityNameMap.get(`agent:${heartbeatAgentId}`) : null)
    : entityNameMap.get(`${event.entityType}:${event.entityId}`);

  const entityTitle = entityTitleMap?.get(`${event.entityType}:${event.entityId}`);

  const link = isHeartbeatEvent && heartbeatAgentId
    ? `/agents/${heartbeatAgentId}/runs/${event.entityId}`
    : entityLink(event.entityType, event.entityId, name);

  const actor = event.actorType === "agent" ? agentMap.get(event.actorId) : null;
  const actorName = actor?.name ?? (
    event.actorType === "system"
      ? (isPortugueseLanguage() ? "Sistema" : "System")
      : event.actorType === "user"
        ? "Board"
        : event.actorId || (isPortugueseLanguage() ? "Desconhecido" : "Unknown")
  );

  const inner = (
    <div className="flex gap-3">
      <p className="flex-1 min-w-0 truncate">
        <Identity
          name={actorName}
          size="xs"
          className="align-baseline"
        />
        <span className="text-muted-foreground ml-1">{verb} </span>
        {name && <span className="font-medium">{name}</span>}
        {entityTitle && <span className="text-muted-foreground ml-1">— {entityTitle}</span>}
      </p>
      <span className="text-xs text-muted-foreground shrink-0 pt-0.5">{timeAgo(event.createdAt)}</span>
    </div>
  );

  const classes = cn(
    "px-4 py-2 text-sm",
    link && "cursor-pointer hover:bg-accent/50 transition-colors",
    className,
  );

  if (link) {
    return (
      <Link to={link} className={cn(classes, "no-underline text-inherit block")}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={classes}>
      {inner}
    </div>
  );
}
