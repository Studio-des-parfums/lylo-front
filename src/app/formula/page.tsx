"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { FormulaNote } from "@/context/SessionContext";
import { useTranslation } from "@/i18n/LanguageContext";
import { AppLanguage, persistLanguage } from "@/lib/language";
import { decodeShareableFormula } from "@/lib/shareableFormula";

function SharedNoteList({ label, notes }: { label: string; notes: FormulaNote[] }) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-primary/12 bg-[#fcfaf8] px-4 py-3">
      <span className="brand-text block text-[0.62rem] text-primary mb-2">{label}</span>
      <ul>
        {notes.map((note) => (
          <li
            key={`${label}-${note.name}`}
            className="flex items-center justify-between gap-3 border-b border-primary/8 py-1.5 text-sm text-[#4f443e] last:border-b-0"
          >
            <span className="truncate">{note.name}</span>
            <span className="shrink-0 font-medium text-primary">{note.ml} ml</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SharedFormulaContent() {
  const searchParams = useSearchParams();
  const { t, setLocale } = useTranslation();
  const data = searchParams.get("data");
  const lang = searchParams.get("lang");

  useEffect(() => {
    if (lang === "fr" || lang === "en" || lang === "es") {
      persistLanguage(lang as AppLanguage);
      setLocale(lang as AppLanguage);
    }
  }, [lang, setLocale]);

  const formula = useMemo(() => {
    if (!data) {
      return null;
    }

    return decodeShareableFormula(data);
  }, [data]);

  if (!formula) {
    return (
      <div className="w-full rounded-2xl border border-primary/10 bg-white/85 p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-primary">
          {t("recommendations.noFormulas")}
        </h1>
        <p className="mt-2 text-sm text-primary/60">
          {t("recommendations.invalidQr")}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-primary">
          {t("quiz.resultsTitleChosen")}
        </h1>
        <p className="mt-1 text-sm text-primary/60">
          {t("quiz.resultsSubtitleChosen")}
        </p>
      </div>

      <div className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
        <div className="mb-4 border-b border-primary/10 pb-3 text-center">
          <p className="brand-text text-[0.62rem] text-primary/70">{t("formula.recommendedFormula")}</p>
          <h2 className="luxury-title mt-2 text-2xl text-primary">{formula.profile}</h2>
          <p className="mt-2 text-xs text-primary/55">{t("formula.version")} {formula.size}</p>
        </div>

        <div className="space-y-3">
          <SharedNoteList label={t("recommendations.noteLabels.top")} notes={formula.notes.top} />
          <SharedNoteList label={t("recommendations.noteLabels.heart")} notes={formula.notes.heart} />
          <SharedNoteList label={t("recommendations.noteLabels.base")} notes={formula.notes.base} />
          <SharedNoteList label={t("recommendations.noteLabels.boosters")} notes={formula.notes.boosters} />
        </div>
      </div>
    </div>
  );
}

function SharedFormulaFallback() {
  const { t } = useTranslation();
  return (
    <div className="w-full rounded-2xl border border-primary/10 bg-white/85 p-6 text-center shadow-sm">
      <h1 className="text-xl font-semibold text-primary">{t("formula.loading")}</h1>
    </div>
  );
}

export default function SharedFormulaPage() {
  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-stone-50">
      <Navbar showActions={false} transparent />

      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute top-24 left-8 h-64 w-64 rounded-full bg-primary blur-[90px]" />
        <div className="absolute right-8 bottom-24 h-64 w-64 rounded-full bg-warm-cream blur-[90px]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center px-4 py-20">
        <Suspense fallback={<SharedFormulaFallback />}>
          <SharedFormulaContent />
        </Suspense>
      </main>
    </div>
  );
}
