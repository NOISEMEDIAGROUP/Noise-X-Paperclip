export function printCerebrouterStdoutEvent(raw: string, _debug: boolean): void {
  const line = raw.trim();
  if (line) console.log(line);
}
