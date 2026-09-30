"use client";

import { useState, FormEvent } from "react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useSession } from "@/context/SessionContext";

export default function PerfumeNameForm() {
  const { t } = useTranslation();
  const { submitPerfumeName } = useSession();
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitted) return;
    setSubmitted(true);
    submitPerfumeName(trimmed);
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-4 px-2">
      <p className="text-center text-sm tracking-widest uppercase text-primary/50 font-medium">
        {t("perfumeName.subtitle")}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("perfumeName.placeholder")}
          maxLength={60}
          disabled={submitted}
          autoFocus
          className="w-full rounded-xl border border-primary/20 bg-white/80 backdrop-blur-sm px-5 py-4 text-center text-lg font-light tracking-wide text-primary placeholder:text-primary/30 focus:outline-none focus:border-primary/50 disabled:opacity-60 transition-colors"
        />
        <button
          type="submit"
          disabled={!name.trim() || submitted}
          className="w-full rounded-full bg-primary text-white text-sm font-semibold py-3 shadow-lg shadow-primary/20 hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitted ? t("perfumeName.submitted") : t("perfumeName.submit")}
        </button>
      </form>
    </div>
  );
}
