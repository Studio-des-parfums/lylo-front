"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import es from "./locales/es.json";
import ar from "./locales/ar.json";
import ru from "./locales/ru.json";

export type Locale = "en" | "fr" | "de" | "es" | "ar" | "ru";

export const SUPPORTED_LOCALES: Locale[] = ["fr", "en", "es", "de", "ar", "ru"];

const RTL_LOCALES: Locale[] = ["ar"];

const translations: Record<Locale, Record<string, unknown>> = { en, fr, de, es, ar, ru };

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function resolve(obj: unknown, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : path;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale | null;
    if (saved && SUPPORTED_LOCALES.includes(saved)) {
      setLocale(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("locale", locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
  }, [locale]);

  const t = (key: string): string => resolve(translations[locale], key);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}
