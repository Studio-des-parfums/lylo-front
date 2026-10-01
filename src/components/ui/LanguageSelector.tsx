"use client";

import { useTranslation, Locale } from "@/i18n/LanguageContext";

interface LanguageSelectorProps {
  className?: string;
}

export default function LanguageSelector({ className = "" }: LanguageSelectorProps) {
  const { locale, setLocale } = useTranslation();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      className={`bg-transparent text-xs font-bold tracking-tighter cursor-pointer outline-none ${className}`}
    >
      <option value="fr">FR</option>
      <option value="en">EN</option>
      <option value="de">DE</option>
      <option value="it">IT</option>
      <option value="es">ES</option>
      <option value="ar">AR</option>
      <option value="ru">RU</option>
    </select>
  );
}
