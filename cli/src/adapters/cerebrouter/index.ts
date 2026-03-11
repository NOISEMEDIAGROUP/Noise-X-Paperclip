import type { CLIAdapterModule } from "@paperclipai/adapter-utils";
import { printCerebrouterStdoutEvent } from "./format-event.js";

export const cerebrouterCLIAdapter: CLIAdapterModule = {
  type: "cerebrouter",
  formatStdoutEvent: printCerebrouterStdoutEvent,
};
