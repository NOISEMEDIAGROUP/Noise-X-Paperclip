import i18n from "i18next";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.resolve(__dirname, "../../locales");

function loadLocale(lang: string, ns: string): Record<string, unknown> {
  try {
    const file = path.join(LOCALES_DIR, lang, `${ns}.json`);
    return JSON.parse(readFileSync(file, "utf-8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const SUPPORTED_LANGUAGES = ["en", "ru"] as const;

const resources: Record<string, Record<string, Record<string, unknown>>> = {};
for (const lang of SUPPORTED_LANGUAGES) {
  resources[lang] = { cli: loadLocale(lang, "cli") };
}

await i18n.init({
  resources,
  lng: process.env.PAPERCLIP_LANG ?? process.env.LANG?.split(".")[0].replace("_", "-") ?? "en",
  fallbackLng: "en",
  defaultNS: "cli",
  interpolation: {
    escapeValue: false,
  },
});

export { i18n };
export const t = i18n.t.bind(i18n);
