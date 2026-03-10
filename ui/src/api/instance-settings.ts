import type { InstanceSettingsResponse, UpdateInstanceSettings } from "@paperclipai/shared";
import { api } from "./client";

export const instanceSettingsApi = {
  get: () => api.get<InstanceSettingsResponse>("/instance/settings"),
  update: (input: UpdateInstanceSettings) =>
    api.patch<{ ok: true; settings: InstanceSettingsResponse }>("/instance/settings", input),
};
