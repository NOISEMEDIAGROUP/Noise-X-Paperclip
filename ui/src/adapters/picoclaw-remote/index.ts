import type { UIAdapterModule } from "../types";
import { buildPicoClawRemoteConfig, parsePicoClawRemoteStdoutLine } from "@paperclipai/adapter-picoclaw-remote/ui";
import { PicoClawRemoteConfigFields } from "./config-fields";

export const picoClawRemoteUIAdapter: UIAdapterModule = {
  type: "picoclaw_remote",
  label: "PicoClaw (remote)",
  parseStdoutLine: parsePicoClawRemoteStdoutLine,
  ConfigFields: PicoClawRemoteConfigFields,
  buildAdapterConfig: buildPicoClawRemoteConfig,
};
