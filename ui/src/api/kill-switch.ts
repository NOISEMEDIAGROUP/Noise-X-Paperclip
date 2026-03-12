import type { KillSwitchStatus, KillAllResult } from "@paperclipai/shared";
import { api } from "./client";

export const killSwitchApi = {
  status: (companyId: string) =>
    api.get<KillSwitchStatus>(`/companies/${companyId}/kill-switch/status`),

  killAll: (companyId: string) =>
    api.post<KillAllResult>(`/companies/${companyId}/kill-switch/kill-all`, {}),

  shutdown: () =>
    api.post<{ ok: boolean; message: string }>(`/kill-switch/shutdown`, {}),
};
