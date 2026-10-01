"use client";

import { useState, useEffect } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { useTranslation } from "@/i18n/LanguageContext";
import { persistLanguage, resolveStoredLanguage } from "@/lib/language";

type AvatarLocale = "fr" | "en" | "es" | "de" | "ar" | "ru";

interface Language {
  code: AvatarLocale;
  nativeName: string;
  englishName: string;
  flag: string;
  region: string;
  available: boolean;
}

const LANGUAGES: Language[] = [
  { code: "fr", nativeName: "Français", englishName: "French", flag: "🇫🇷", region: "France", available: true },
  { code: "en", nativeName: "English", englishName: "English", flag: "🇬🇧", region: "United Kingdom", available: true },
  { code: "es", nativeName: "Español", englishName: "Spanish", flag: "🇪🇸", region: "España", available: true },
  { code: "de", nativeName: "Deutsch", englishName: "German", flag: "🇩🇪", region: "Deutschland", available: true },
  { code: "ar", nativeName: "العربية", englishName: "Arabic", flag: "🇸🇦", region: "العربية", available: true },
  { code: "ru", nativeName: "Русский", englishName: "Russian", flag: "🇷🇺", region: "Россия", available: true },
];

export default function LanguagePicker() {
  const { t } = useTranslation();
  const [avatarLocale, setAvatarLocale] = useState<AvatarLocale>("fr");
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = resolveStoredLanguage();
    setAvatarLocale(saved);
    persistLanguage(saved);
  }, []);

  const currentLang = LANGUAGES.find((l) => l.code === avatarLocale) ?? LANGUAGES[0];

  const openModal = () => {
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  };

  const closeModal = () => {
    setVisible(false);
    setTimeout(() => setOpen(false), 300);
  };

  const handleSelect = (code: AvatarLocale) => {
    setAvatarLocale(code);
    persistLanguage(code);
    closeModal();
  };

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <section>
      <h3 className="text-surface text-xs font-bold uppercase tracking-widest leading-tight mb-1.5 [@media(max-height:620px)]:mb-1 flex items-center gap-2">
        <MaterialIcon name="record_voice_over" className="text-sm" />
        {t("configure.languageTitle")}
      </h3>

      {/* Trigger */}
      <button
        onClick={openModal}
        className="w-full flex items-center justify-between px-3 py-2 [@media(max-height:620px)]:py-1.5 rounded-lg border-2 border-primary/10 brand-surface-soft text-primary hover:bg-primary/5 hover:border-primary/25 transition-all group cursor-pointer"
      >
        <div className="flex items-center gap-4 [@media(max-height:620px)]:gap-2.5">
          <span className="text-2xl [@media(max-height:620px)]:text-xl leading-none">{currentLang.flag}</span>
          <div className="text-left">
            <div className="text-sm font-bold text-primary">{currentLang.nativeName}</div>
            <div className="text-xs text-primary/50 [@media(max-height:620px)]:hidden">{currentLang.region}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-primary/40 group-hover:text-primary/70 transition-colors">
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold hidden sm:block">
            {t("configure.languageChange")}
          </span>
          <MaterialIcon name="chevron_right" className="text-base" />
        </div>
      </button>

      {/* Modal */}
      {open && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
            visible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={closeModal}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 backdrop-blur-md" />

          {/* Card */}
          <div
            className={`relative w-full max-w-md rounded-2xl p-8 shadow-2xl border border-primary/10 brand-surface transition-all duration-300 ${
              visible ? "scale-100 translate-y-0" : "scale-95 translate-y-6"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 mb-5">
                <span className="h-px w-10 bg-primary/30" />
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MaterialIcon name="record_voice_over" className="text-primary text-xl" />
                </div>
                <span className="h-px w-10 bg-primary/30" />
              </div>
              <h2 className="text-2xl font-bold text-primary font-display tracking-tight mb-2">
                {t("configure.languageModalTitle")}
              </h2>
              <p className="text-sm text-primary/55 font-medium">
                {t("configure.languageModalSubtitle")}
              </p>
            </div>

            {/* Language list */}
            <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
              {LANGUAGES.map((lang) => {
                const isSelected = avatarLocale === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleSelect(lang.code)}
                    disabled={!lang.available}
                    aria-disabled={!lang.available}
                    className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all duration-200 ${
                      !lang.available
                        ? "border-primary/5 brand-surface-soft text-primary/35 opacity-50 cursor-not-allowed"
                        : isSelected
                        ? "border-primary bg-primary text-white shadow-xl cursor-pointer"
                        : "border-primary/10 brand-surface-soft text-primary hover:border-primary/30 hover:bg-primary/5 cursor-pointer"
                    }`}
                  >
                    <span className={`text-2xl leading-none shrink-0 ${!lang.available ? "grayscale" : ""}`}>{lang.flag}</span>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-bold leading-tight truncate">{lang.nativeName}</div>
                      <div
                        className={`text-xs font-medium truncate ${
                          isSelected ? "text-white/65" : "text-primary/45"
                        }`}
                      >
                        {lang.region}
                      </div>
                    </div>
                    {!lang.available && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-bold uppercase tracking-wide">
                        {t("configure.languageComingSoon")}
                      </span>
                    )}
                    {isSelected && (
                      <MaterialIcon name="check_circle" className="text-white/80 text-base shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <span className="flex-1 h-px bg-primary/10" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-primary/30 font-bold">
                {LANGUAGES.filter((l) => l.available).length} {t("configure.languageAvailable")}
              </span>
              <span className="flex-1 h-px bg-primary/10" />
            </div>

            {/* Close */}
            <button
              onClick={closeModal}
              className="w-full py-3 text-xs text-primary/45 hover:text-primary font-bold uppercase tracking-[0.2em] transition-colors cursor-pointer"
            >
              {t("configure.languageClose")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
