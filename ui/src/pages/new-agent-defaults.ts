export function withFirstAgentCeoDefault(value: string, isFirstAgent: boolean): string {
  if (!isFirstAgent) {
    return value;
  }

  if (value.trim().length === 0) {
    return "CEO";
  }

  return value;
}
