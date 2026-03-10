import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import zhCommon from "./locales/zh/common.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English", shortLabel: "EN" },
  { code: "zh", label: "Chinese", nativeLabel: "中文", shortLabel: "中文" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const STORAGE_KEY = "paperclip-language";

function normalizeLanguageCode(lng: string | null | undefined): LanguageCode | null {
  if (!lng) return null;
  const base = lng.split("-")[0]?.toLowerCase() ?? "";
  return SUPPORTED_LANGUAGES.some((l) => l.code === base) ? (base as LanguageCode) : null;
}

function detectLanguage(): LanguageCode {
  // This module is imported unconditionally from the UI entrypoint; avoid crashing
  // in non-browser contexts (tests, SSR) by falling back to English.
  if (typeof window === "undefined" || typeof navigator === "undefined") return "en";

  try {
    const stored = normalizeLanguageCode(window.localStorage?.getItem(STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // ignore storage access failures
  }

  const browserLang = (navigator.language || "").toLowerCase();
  return browserLang.startsWith("zh") ? "zh" : "en";
}

const initPromise = i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon },
    zh: { common: zhCommon },
  },
  lng: detectLanguage(),
  fallbackLng: "en",
  defaultNS: "common",
  ns: ["common"],
  interpolation: {
    escapeValue: false,
  },
});

// Ensure the initial detected language is reflected for a11y and persisted
// even if the user never toggles languages.
void initPromise.then(() => {
  const lng = normalizeLanguageCode(i18n.language) ?? "en";
  if (typeof window !== "undefined") {
    try {
      window.localStorage?.setItem(STORAGE_KEY, lng);
    } catch {
      // ignore storage access failures
    }
  }
  if (typeof document !== "undefined") document.documentElement.lang = lng;
});

i18n.on("languageChanged", (lng) => {
  const normalized = normalizeLanguageCode(lng) ?? "en";
  if (typeof window !== "undefined") {
    try {
      window.localStorage?.setItem(STORAGE_KEY, normalized);
    } catch {
      // ignore storage access failures
    }
  }
  if (typeof document !== "undefined") document.documentElement.lang = normalized;
});

export { i18n };
export default i18n;
