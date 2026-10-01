export type AppLanguage = "fr" | "en" | "es";

// Note: this only governs the AI voice avatar's spoken language. It is
// intentionally separate from the UI text language, which is stored under
// the "locale" key by LanguageContext and supports 7 languages.
export function resolveStoredLanguage(): AppLanguage {
  if (typeof window === "undefined") {
    return "fr";
  }

  const candidates = [
    localStorage.getItem("avatarLocale"),
    localStorage.getItem("language"),
  ];

  for (const value of candidates) {
    if (value === "fr" || value === "en" || value === "es") {
      return value;
    }
  }

  return "fr";
}

export function persistLanguage(language: AppLanguage) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem("avatarLocale", language);
  localStorage.setItem("language", language);
}
