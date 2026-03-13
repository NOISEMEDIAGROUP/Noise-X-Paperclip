import type { TranscriptEntry } from "@paperclipai/adapter-utils";

export function parsePicoClawRemoteStdoutLine(line: string, ts: string): TranscriptEntry[] {
  if (line.startsWith("stderr")) return [{ kind: "stderr", ts, text: line }];
  return [{ kind: "stdout", ts, text: line }];
}
