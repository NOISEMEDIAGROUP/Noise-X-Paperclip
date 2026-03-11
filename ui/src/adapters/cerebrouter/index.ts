import type { UIAdapterModule } from "../types";
import { parseCerebrouterStdoutLine } from "./parse-stdout";
import { CerebrouterConfigFields } from "./config-fields";
import { buildCerebrouterConfig } from "./build-config";

export const cerebrouterUIAdapter: UIAdapterModule = {
  type: "cerebrouter",
  label: "Cerebrouter",
  parseStdoutLine: parseCerebrouterStdoutLine,
  ConfigFields: CerebrouterConfigFields,
  buildAdapterConfig: buildCerebrouterConfig,
};
