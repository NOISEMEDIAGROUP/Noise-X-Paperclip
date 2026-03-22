import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../../context/CompanyContext";
import { useBreadcrumbs } from "../../context/BreadcrumbContext";
import { businessOsApi } from "../../api/businessOs";
import { secretsApi } from "../../api/secrets";
import { queryKeys } from "../../lib/queryKeys";

const CHANNEL_FIELDS = [
  "telegramChatId",
  "notificationEmail",
  "resendFromEmail",
  "slackDefaultChannelId",
  "githubRepoOwner",
  "githubRepoName",
  "linkedinPageId",
  "uptimeKumaUrl",
  "plausibleSiteId",
  "cryptoProvider",
  "cryptoWalletAddress",
  "cryptoNetwork",
];

const FIELD_LABELS: Record<string, string> = {
  telegramChatId: "Telegram Chat ID",
  notificationEmail: "Notification Email",
  resendFromEmail: "Resend From Email",
  slackDefaultChannelId: "Slack Default Channel ID",
  githubRepoOwner: "GitHub Repo Owner",
  githubRepoName: "GitHub Repo Name",
  linkedinPageId: "LinkedIn Page ID",
  uptimeKumaUrl: "Uptime Kuma URL",
  plausibleSiteId: "Plausible Site ID",
  cryptoProvider: "Crypto Provider",
  cryptoWalletAddress: "Crypto Wallet Address",
  cryptoNetwork: "Crypto Network",
};

export function NotificationSettingsPage() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<any>({
    telegramChatId: "",
    notificationEmail: "",
    telegramEnabled: false,
    emailEnabled: false,
    slackEnabled: false,
    slackDefaultChannelId: "",
    resendFromEmail: "",
    githubRepoOwner: "",
    githubRepoName: "",
    linkedinPageId: "",
    uptimeKumaUrl: "",
    plausibleSiteId: "",
    cryptoProvider: "",
    cryptoWalletAddress: "",
    cryptoNetwork: "",
  });
  const [secretName, setSecretName] = useState("business-resend-api-key");
  const [secretValue, setSecretValue] = useState("");

  useEffect(
    () =>
      setBreadcrumbs([
        { label: selectedCompany?.name ?? "Company", href: "/dashboard" },
        { label: "Settings", href: "/settings/config" },
        { label: "Notifications" },
      ]),
    [selectedCompany?.name, setBreadcrumbs],
  );

  const configQuery = useQuery({
    queryKey: selectedCompanyId ? queryKeys.businessOs.config(selectedCompanyId) : ["business-os", "config", "none"],
    queryFn: () => businessOsApi.config(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });
  const secretsQuery = useQuery({
    queryKey: selectedCompanyId ? queryKeys.secrets.list(selectedCompanyId) : ["secrets", "none"],
    queryFn: () => secretsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  useEffect(() => {
    if (configQuery.data) setForm((prev: any) => ({ ...prev, ...configQuery.data }));
  }, [configQuery.data]);

  const saveConfig = useMutation({
    mutationFn: () => businessOsApi.updateConfig(selectedCompanyId!, form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.businessOs.config(selectedCompanyId!) }),
  });
  const saveSecret = useMutation({
    mutationFn: () => secretsApi.create(selectedCompanyId!, { name: secretName, value: secretValue }),
    onSuccess: () => {
      setSecretValue("");
      queryClient.invalidateQueries({ queryKey: queryKeys.secrets.list(selectedCompanyId!) });
    },
  });

  const knownSecrets = useMemo(() => new Set((secretsQuery.data ?? []).map((s: any) => s.name)), [secretsQuery.data]);

  if (!selectedCompanyId) return null;
  if (configQuery.isLoading) return <div className="text-sm text-muted-foreground">Loading notification settings...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Notification Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure channels (Telegram, Email, Slack), integration details, and manage secrets for live delivery.
        </p>
      </div>

      {/* Channel toggles */}
      <div className="flex gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(form.telegramEnabled)}
            onChange={(e) => setForm((p: any) => ({ ...p, telegramEnabled: e.target.checked }))}
          />
          Telegram
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(form.emailEnabled)}
            onChange={(e) => setForm((p: any) => ({ ...p, emailEnabled: e.target.checked }))}
          />
          Email
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(form.slackEnabled)}
            onChange={(e) => setForm((p: any) => ({ ...p, slackEnabled: e.target.checked }))}
          />
          Slack
        </label>
      </div>

      {/* Config fields */}
      <div className="grid gap-3 md:grid-cols-2">
        {CHANNEL_FIELDS.map((field) => (
          <div key={field} className="space-y-1">
            <label className="text-xs text-muted-foreground">{FIELD_LABELS[field] ?? field}</label>
            <input
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
              placeholder={FIELD_LABELS[field] ?? field}
              value={form[field] ?? ""}
              onChange={(e) => setForm((prev: any) => ({ ...prev, [field]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <button
        className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent/50"
        onClick={() => saveConfig.mutate()}
        disabled={saveConfig.isPending}
      >
        {saveConfig.isPending ? "Saving..." : "Save settings"}
      </button>

      {/* Secrets management */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="text-sm font-medium">Managed secrets</div>
        <div className="text-xs text-muted-foreground">
          Use names like <code>business-slack-bot-token</code>,{" "}
          <code>business-telegram-bot-token</code>, or{" "}
          <code>business-resend-api-key</code> as needed.
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            value={secretName}
            onChange={(e) => setSecretName(e.target.value)}
            placeholder="Secret name"
          />
          <input
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            value={secretValue}
            onChange={(e) => setSecretValue(e.target.value)}
            placeholder={knownSecrets.has(secretName) ? "Rotate secret value..." : "Paste secret value..."}
            type="password"
          />
        </div>
        <button
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent/50 disabled:opacity-50"
          onClick={() => saveSecret.mutate()}
          disabled={!secretName.trim() || !secretValue.trim() || saveSecret.isPending}
        >
          {saveSecret.isPending ? "Saving..." : knownSecrets.has(secretName) ? "Rotate secret" : "Save secret"}
        </button>
      </div>
    </div>
  );
}
