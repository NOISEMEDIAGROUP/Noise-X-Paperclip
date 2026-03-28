import { translateInstant } from "../i18n";

const SEEDED_NAME_TRANSLATION_KEYS: Record<string, string> = {
  CEO: "seededName.ceo",
  "Chief Technology Officer": "seededName.ceo",
  "首席执行官": "seededName.ceo",
  Onboarding: "seededName.onboarding",
  "入门引导": "seededName.onboarding",
};

export function displaySeededName(name: string | null | undefined): string {
  if (!name) return "";
  const translationKey = SEEDED_NAME_TRANSLATION_KEYS[name];
  return translationKey
    ? translateInstant(translationKey, { defaultValue: name })
    : name;
}
