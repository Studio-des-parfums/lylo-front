"use client";

import { useState, useEffect } from "react";
import ChoiceCard from "./ChoiceCard";
import { Choice, useSession } from "@/context/SessionContext";
import { useTranslation } from "@/i18n/LanguageContext";

interface ChoiceGridProps {
  choices: Choice[];
}

export default function ChoiceGrid({ choices }: ChoiceGridProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const [clickSelected, setClickSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const { hiddenChoices, clickSelectionMode, submitClickAnswer, answerFormat } = useSession();
  // Nombre de cartes à sélectionner pour l'étape en cours (format du questionnaire)
  const required = clickSelectionMode === "bottom_2" ? answerFormat.negative_count : answerFormat.positive_count;

  // Reset selection when choices change (new question)
  useEffect(() => {
    setSelected(null);
    setClickSelected([]);
    setSubmitted(false);
  }, [choices]);

  // Reset click selection when mode changes (nouvelle étape, ou réponse actée à l'oral)
  useEffect(() => {
    if (clickSelectionMode === null) {
      setClickSelected([]);
      setSubmitted(false);
    }
  }, [clickSelectionMode]);

  const normalize = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  // Le numéro reste celui d'origine (1…n) même quand des cartes sont masquées
  const visibleChoices = choices
    .map((choice, i) => ({ choice, number: i + 1 }))
    .filter(({ choice }) => !hiddenChoices.some((h) => normalize(h) === normalize(choice.label)));
  // Lignes complètes, dernière ligne centrée (5 cartes = 3 + 2 centrées)
  const rows = Math.max(1, Math.ceil(visibleChoices.length / 3));
  const mobileRows = Math.max(1, Math.ceil(visibleChoices.length / 2));

  const handleCardSelect = (label: string) => {
    if (clickSelectionMode !== null) {
      if (submitted) return;
      // Mode clic : sélection jusqu'à `required` cartes, le bouton Valider envoie ensuite
      setClickSelected((prev) => {
        if (prev.includes(label)) return prev.filter((l) => l !== label);
        if (prev.length >= required) return prev;
        return [...prev, label];
      });
    } else {
      // Mode voix : sélection visuelle simple (pas d'action)
      setSelected(label);
    }
  };

  const handleValidate = () => {
    if (clickSelected.length !== required || submitted) return;
    setSubmitted(true);
    submitClickAnswer(clickSelected);
  };

  return (
    <div className="relative w-full max-w-5xl flex-1 min-h-0 flex flex-col gap-3">
      <div
        className="flex flex-wrap justify-center content-stretch gap-2 sm:gap-3 w-full py-2 flex-1 min-h-0 max-h-[52vh] sm:max-h-[48vh]"
        style={{ "--rows": rows, "--mobile-rows": mobileRows } as React.CSSProperties}
      >
        {visibleChoices.map(({ choice, number }) => (
          <div
            key={choice.label}
            className="w-[calc((100%-0.5rem)/2)] h-[calc((100%-(var(--mobile-rows)-1)*0.5rem)/var(--mobile-rows))] sm:w-[calc((100%-1.5rem)/3)] sm:h-[calc((100%-(var(--rows)-1)*0.75rem)/var(--rows))]"
          >
          <ChoiceCard
            name={choice.label}
            number={number}
            imageUrl={
              choice.image
                ? /^https?:\/\//.test(choice.image)
                  ? choice.image
                  : `${process.env.NEXT_PUBLIC_API_URL}${choice.image}`
                : undefined
            }
            selected={
              clickSelectionMode !== null
                ? clickSelected.includes(choice.label)
                : selected === choice.label
            }
            clickable={clickSelectionMode !== null && !submitted}
            onSelect={handleCardSelect}
          />
          </div>
        ))}
      </div>
      {clickSelectionMode !== null && clickSelected.length === required && (
        <div className="shrink-0 flex justify-center">
          <button
            type="button"
            onClick={handleValidate}
            disabled={submitted}
            className="rounded-full bg-primary text-white text-sm font-semibold px-8 py-3 shadow-lg shadow-primary/20 hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitted ? t("choiceGrid.submitted") : t("choiceGrid.validate")}
          </button>
        </div>
      )}
    </div>
  );
}
