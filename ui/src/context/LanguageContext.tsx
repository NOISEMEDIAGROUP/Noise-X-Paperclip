import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_UI_LANGUAGE, type UiLanguage, setCurrentLanguage } from "../lib/locale";

interface LanguageContextValue {
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
}

const LANGUAGE_STORAGE_KEY = "paperclip.ui.language";
const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function resolveInitialLanguage(): UiLanguage {
  if (typeof window === "undefined") return DEFAULT_UI_LANGUAGE;

  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "pt-BR" || stored === "en") return stored;
  } catch {
    // Ignore storage failures in restricted environments.
  }

  const browserLocale = window.navigator.language;
  return browserLocale.toLowerCase().startsWith("pt") ? "pt-BR" : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<UiLanguage>(() => resolveInitialLanguage());

  const setLanguage = useCallback((nextLanguage: UiLanguage) => {
    setLanguageState(nextLanguage);
  }, []);

  useEffect(() => {
    setCurrentLanguage(language);
    document.documentElement.lang = language;
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Ignore storage failures in restricted environments.
    }
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
    }),
    [language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
