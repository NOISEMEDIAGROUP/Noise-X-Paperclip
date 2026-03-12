import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const isZh = i18n.language?.startsWith("zh");

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground shrink-0"
      onClick={() => i18n.changeLanguage(isZh ? "en" : "zh")}
      aria-label={isZh ? "Switch to English" : "切换到中文"}
      title={isZh ? "English" : "中文"}
    >
      <Languages className="h-4 w-4" />
    </Button>
  );
}
