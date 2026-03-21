import type { UIAdapterModule } from "../types";
import { parseEmissoSandboxStdoutLine } from "./parse-stdout";
import { EmissoSandboxConfigFields } from "./config-fields";
import { buildEmissoSandboxConfig } from "./build-config";

export const emissoSandboxUIAdapter: UIAdapterModule = {
  type: "emisso_sandbox",
  label: "Emisso Sandbox",
  parseStdoutLine: parseEmissoSandboxStdoutLine,
  ConfigFields: EmissoSandboxConfigFields,
  buildAdapterConfig: buildEmissoSandboxConfig,
};
