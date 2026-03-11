import type { TranscriptEntry } from "../types";

export function parseCerebrouterStdoutLine(line: string, ts: string): TranscriptEntry[] {
  return [{ kind: "stdout", ts, text: line }];
}
