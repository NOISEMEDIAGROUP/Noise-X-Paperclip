export interface AlibabaAutoApplyInput {
  modelProvider: string;
  processRuntimeProfile: string;
  modelProfileId: string;
  alibabaModelProfileIds: string[];
  alibabaRuntimeProfileId: string;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function shouldAutoApplyAlibabaProcessConfig(input: AlibabaAutoApplyInput): boolean {
  const provider = normalize(input.modelProvider);
  if (provider === "alibaba") return true;

  const runtimeProfile = input.processRuntimeProfile.trim();
  if (runtimeProfile === input.alibabaRuntimeProfileId) return true;

  if (!input.modelProfileId.trim()) return false;
  return input.alibabaModelProfileIds.some((profileId) => profileId === input.modelProfileId);
}
