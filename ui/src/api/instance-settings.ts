import { api } from "./client";

export type HeartbeatSchedulerSettings = {
  enabled: boolean;
  intervalMs: number;
};

export const instanceSettingsApi = {
  getHeartbeat: () => api.get<HeartbeatSchedulerSettings>("/instance/settings/heartbeat"),
  updateHeartbeat: (data: HeartbeatSchedulerSettings) =>
    api.patch<HeartbeatSchedulerSettings>("/instance/settings/heartbeat", data),
};
