import { UserPlus, Lightbulb, Play, ShieldCheck } from "lucide-react";

export const typeLabel: Record<string, string> = {
  hire_agent: "Hire Agent",
  approve_ceo_strategy: "CEO Strategy",
  action: "Action",
};

export const typeIcon: Record<string, typeof UserPlus> = {
  hire_agent: UserPlus,
  approve_ceo_strategy: Lightbulb,
  action: Play,
};

export const defaultTypeIcon = ShieldCheck;

function PayloadField({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs">{label}</span>
      <span>{String(value)}</span>
    </div>
  );
}

export function HireAgentPayload({ payload }: { payload: Record<string, unknown> }) {
  return (
    <div className="mt-3 space-y-1.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs">Name</span>
        <span className="font-medium">{String(payload.name ?? "—")}</span>
      </div>
      <PayloadField label="Role" value={payload.role} />
      <PayloadField label="Title" value={payload.title} />
      <PayloadField label="Icon" value={payload.icon} />
      {payload.capabilities != null && (
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs pt-0.5">Capabilities</span>
          <span className="text-muted-foreground">{String(payload.capabilities)}</span>
        </div>
      )}
      {payload.adapterType != null && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs">Adapter</span>
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
            {String(payload.adapterType)}
          </span>
        </div>
      )}
    </div>
  );
}

function formatLabel(key: string): string {
  const spaced = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function GenericPayloadValue({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null;

  // String arrays → list of copyable items
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return (
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">{label}</span>
        <div className="flex flex-wrap gap-1.5">
          {(value as string[]).map((item, i) => (
            <button
              key={i}
              type="button"
              className="text-xs bg-muted px-2 py-1 rounded-md hover:bg-muted/80 transition-colors cursor-pointer text-left"
              onClick={() => navigator.clipboard?.writeText(item).catch(() => {})}
              title="Click to copy"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Long strings → scrollable block
  if (typeof value === "string" && value.length > 80) {
    return (
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">{label}</span>
        <div className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground whitespace-pre-wrap font-mono text-xs max-h-48 overflow-y-auto">
          {value}
        </div>
      </div>
    );
  }

  // Objects / non-string arrays → formatted JSON
  if (typeof value === "object") {
    return (
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">{label}</span>
        <pre className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground overflow-x-auto max-h-48">
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    );
  }

  // Short scalars → inline key-value
  return <PayloadField label={label} value={value} />;
}

export function GenericPayload({ payload }: { payload: Record<string, unknown> }) {
  const entries = Object.entries(payload).filter(([, v]) => v != null);
  if (entries.length === 0) {
    return (
      <div className="mt-3 text-xs text-muted-foreground italic">No payload data</div>
    );
  }
  return (
    <div className="mt-3 space-y-2 text-sm">
      {entries.map(([key, value]) => (
        <GenericPayloadValue key={key} label={formatLabel(key)} value={value} />
      ))}
    </div>
  );
}

export function ApprovalPayloadRenderer({ type, payload }: { type: string; payload: Record<string, unknown> }) {
  if (type === "hire_agent") return <HireAgentPayload payload={payload} />;
  return <GenericPayload payload={payload} />;
}
