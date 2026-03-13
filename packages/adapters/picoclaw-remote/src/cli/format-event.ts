import pc from "picocolors";

export function printPicoClawRemoteStreamEvent(line: string, debug = false): void {
  const trimmed = line.trim();
  if (!trimmed) return;
  if (trimmed.startsWith("stderr")) {
    console.error(pc.red(trimmed));
    return;
  }
  if (debug) {
    console.log(pc.dim(trimmed));
    return;
  }
  console.log(trimmed);
}
