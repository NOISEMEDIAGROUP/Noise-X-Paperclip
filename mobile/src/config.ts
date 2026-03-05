export interface PaperclipMobileConfig {
  apiUrl: string;
  companyId: string;
  agentId: string;
  missing: string[];
}

const FALLBACK_API_URL = "http://127.0.0.1:3004";

export function getPaperclipConfig(): PaperclipMobileConfig {
  const apiUrl = (process.env.EXPO_PUBLIC_PAPERCLIP_API_URL ?? FALLBACK_API_URL).replace(
    /\/+$/,
    "",
  );
  const companyId = process.env.EXPO_PUBLIC_PAPERCLIP_COMPANY_ID ?? "";
  const agentId = process.env.EXPO_PUBLIC_PAPERCLIP_AGENT_ID ?? "";

  const missing: string[] = [];
  if (!companyId) {
    missing.push("EXPO_PUBLIC_PAPERCLIP_COMPANY_ID");
  }
  if (!agentId) {
    missing.push("EXPO_PUBLIC_PAPERCLIP_AGENT_ID");
  }

  return {
    apiUrl,
    companyId,
    agentId,
    missing,
  };
}

export function appConfigSummary(config: PaperclipMobileConfig): string {
  if (config.missing.length > 0) {
    return `Missing: ${config.missing.join(", ")}`;
  }

  return `Company ${config.companyId.slice(0, 8)}..., Agent ${config.agentId.slice(0, 8)}...`;
}
