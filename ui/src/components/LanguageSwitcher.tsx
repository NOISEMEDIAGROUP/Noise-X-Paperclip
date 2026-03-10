import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "../i18n/i18n";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const currentLang = (i18n.language.split("-")[0] || "en") as LanguageCode;
  const safeLang: LanguageCode = SUPPORTED_LANGUAGES.some((l) => l.code === currentLang) ? currentLang : "en";

  function toggleLanguage() {
    const next = safeLang === "en" ? "zh" : "en";
    i18n.changeLanguage(next);
  }

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === safeLang);
  const currentLabel = current?.nativeLabel ?? "English";
  const currentShortLabel = current?.shortLabel ?? "EN";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      onClick={toggleLanguage}
      aria-label={`${t("common.language")}: ${currentLabel}`}
      title={`${t("common.language")}: ${currentLabel}`}
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs font-medium">{currentShortLabel}</span>
    </Button>
  );
}
