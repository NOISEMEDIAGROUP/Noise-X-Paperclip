import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { businessOsApi } from "../../api/businessOs";
import { useCompany } from "../../context/CompanyContext";
import { useBreadcrumbs } from "../../context/BreadcrumbContext";
import { queryKeys } from "../../lib/queryKeys";
import { cn } from "../../lib/utils";
import { RecommendationsSection } from "../../components/settings/RecommendationsSection";
import {
  CreditCard,
  Mail,
  MessageCircle,
  Github,
  Twitter,
  Bitcoin,
  Bug,
  Activity,
  BarChart3,
  Slack,
} from "lucide-react";

const statusStyles: Record<string, string> = {
  connected: "text-green-500 bg-green-500/10 border-green-500/30",
  partial: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30",
  not_configured: "text-muted-foreground bg-muted border-border",
};

const INTEGRATIONS: Array<{
  key: string;
  label: string;
  description: string;
  icon: typeof CreditCard;
  docs: string;
  fields: Array<{ key: string; label: string }>;
}> = [
  {
    key: "stripe",
    label: "Stripe",
    description: "Payment processing. Syncs revenue events, subscriptions, and customer data.",
    icon: CreditCard,
    docs: "Set your Stripe secret key and webhook secret in secrets.",
    fields: [
      { key: "secretKeyPresent", label: "Secret key" },
      { key: "webhookSecretPresent", label: "Webhook secret" },
    ],
  },
  {
    key: "telegram",
    label: "Telegram",
    description: "Chat notifications. Sends daily briefs, alerts, and critical updates to your Telegram.",
    icon: MessageCircle,
    docs: "Enable Telegram, add your bot token as a secret, and set your chat ID.",
    fields: [
      { key: "enabled", label: "Enabled" },
      { key: "botTokenPresent", label: "Bot token" },
      { key: "chatIdConfigured", label: "Chat ID" },
    ],
  },
  {
    key: "slack",
    label: "Slack",
    description: "Team messaging. Receives Slack messages as tasks and sends agent responses back.",
    icon: Slack,
    docs: "Enable Slack, add your bot token and signing secret, set a default channel ID.",
    fields: [
      { key: "enabled", label: "Enabled" },
      { key: "botTokenPresent", label: "Bot token" },
      { key: "signingSecretPresent", label: "Signing secret" },
      { key: "defaultChannelConfigured", label: "Default channel" },
    ],
  },
  {
    key: "resend",
    label: "Email (Resend)",
    description: "Email delivery. Sends transactional emails, welcome messages, and newsletter issues.",
    icon: Mail,
    docs: "Add your Resend API key as a secret and configure a from-email address.",
    fields: [
      { key: "enabled", label: "Enabled" },
      { key: "apiKeyPresent", label: "API key" },
      { key: "fromEmailConfigured", label: "From email" },
    ],
  },
  {
    key: "github",
    label: "GitHub",
    description: "Source control. Links projects to GitHub repos for code awareness.",
    icon: Github,
    docs: "Add your GitHub token as a secret and configure owner/repo.",
    fields: [
      { key: "tokenPresent", label: "Token" },
      { key: "repoConfigured", label: "Repo" },
    ],
  },
  {
    key: "sentry",
    label: "Sentry",
    description: "Error tracking. Monitors application errors and performance issues.",
    icon: Bug,
    docs: "Add your Sentry DSN as a secret.",
    fields: [{ key: "secretPresent", label: "DSN configured" }],
  },
  {
    key: "uptimeKuma",
    label: "Uptime Kuma",
    description: "Uptime monitoring. Tracks product health and endpoint availability.",
    icon: Activity,
    docs: "Set your Uptime Kuma URL and add the API key as a secret.",
    fields: [
      { key: "urlConfigured", label: "URL" },
      { key: "apiKeyPresent", label: "API key" },
    ],
  },
  {
    key: "plausible",
    label: "Plausible",
    description: "Privacy-first analytics. Tracks page views and user engagement.",
    icon: BarChart3,
    docs: "Set your Plausible site ID and add the API key as a secret.",
    fields: [
      { key: "configured", label: "Site ID" },
      { key: "secretPresent", label: "API key" },
    ],
  },
];

function boolLabel(value: any): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return String(value ?? "—");
}

export function ConfigCenterPage() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  useEffect(
    () =>
      setBreadcrumbs([
        { label: selectedCompany?.name ?? "Company", href: "/dashboard" },
        { label: "Integration Status" },
      ]),
    [selectedCompany?.name, setBreadcrumbs],
  );

  const query = useQuery({
    queryKey: selectedCompanyId
      ? queryKeys.businessOs.integrationStatus(selectedCompanyId)
      : ["business-os", "integration-status", "none"],
    queryFn: () => businessOsApi.integrationStatus(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  if (!selectedCompanyId) return null;
  if (query.isLoading)
    return <div className="text-sm text-muted-foreground">Loading integration status...</div>;

  const data = query.data ?? {};

  const connectedCount = INTEGRATIONS.filter((i) => data[i.key]?.status === "connected").length;
  const partialCount = INTEGRATIONS.filter((i) => data[i.key]?.status === "partial").length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Integration Status</h1>
        <p className="text-sm text-muted-foreground">
          See which services are connected and what's needed to complete setup.
          Configure secrets in{" "}
          <a href="/settings/integrations" className="underline">
            Settings → Integrations
          </a>
          .
        </p>
      </div>

      {/* Agent Recommendations Section */}
      <RecommendationsSection />

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase">Connected</div>
          <div className="mt-2 text-3xl font-semibold text-green-500">{connectedCount}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase">Partial</div>
          <div className="mt-2 text-3xl font-semibold text-yellow-500">{partialCount}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase">Not Configured</div>
          <div className="mt-2 text-3xl font-semibold text-muted-foreground">
            {INTEGRATIONS.length - connectedCount - partialCount}
          </div>
        </div>
      </div>

      {/* Integration cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {INTEGRATIONS.map((integration) => {
          const status = data[integration.key] ?? {};
          const statusValue = status.status ?? "not_configured";
          const Icon = integration.icon;
          return (
            <div key={integration.key} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{integration.label}</span>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs",
                    statusStyles[statusValue] ?? statusStyles.not_configured,
                  )}
                >
                  {statusValue.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{integration.description}</p>

              {/* Field checks */}
              <div className="space-y-1.5">
                {integration.fields.map((field) => (
                  <div key={field.key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{field.label}</span>
                    <span
                      className={cn(
                        "font-medium",
                        status[field.key] === true ? "text-green-500" : "text-muted-foreground",
                      )}
                    >
                      {boolLabel(status[field.key])}
                    </span>
                  </div>
                ))}
              </div>

              {statusValue !== "connected" && (
                <div className="mt-3 pt-3 border-t border-border/60">
                  <p className="text-xs text-muted-foreground">{integration.docs}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
