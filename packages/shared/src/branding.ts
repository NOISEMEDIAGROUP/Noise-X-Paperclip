export const SUPPORTED_UI_LOCALES = ["zh-CN", "en"] as const;

export type UiLocale = (typeof SUPPORTED_UI_LOCALES)[number];

export const DEFAULT_UI_LOCALE: UiLocale = "zh-CN";

export const BRANDING = {
  productName: "Penclip",
  legacyProductName: "Paperclip",
  organizationName: "penclipai",
  repositoryUrl: "https://github.com/penclipai/paperclip",
  websiteUrl: "https://penclip.ing",
  docsUrl: "https://penclip.ing/docs",
  chinaWebsiteUrl: "https://paperclipai.cn",
} as const;

export function normalizeUiLocale(value: string | null | undefined): UiLocale {
  if (!value) return DEFAULT_UI_LOCALE;
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("zh")) return "zh-CN";
  if (normalized.startsWith("en")) return "en";
  return DEFAULT_UI_LOCALE;
}

export function resolveUiLocaleFromHeader(headerValue: string | null | undefined): UiLocale {
  if (!headerValue) return DEFAULT_UI_LOCALE;

  const candidates = headerValue
    .split(",")
    .map((segment) => segment.split(";")[0]?.trim())
    .filter((segment): segment is string => Boolean(segment));

  for (const candidate of candidates) {
    const locale = normalizeUiLocale(candidate);
    if (SUPPORTED_UI_LOCALES.includes(locale)) return locale;
  }

  return DEFAULT_UI_LOCALE;
}
