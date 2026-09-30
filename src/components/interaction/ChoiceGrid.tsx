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
  const { hiddenChoices, clickSelectionMode, submitClickAnswer } = useSession();

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
  const visibleChoices = choices.filter(
    (choice) => !hiddenChoices.some((h) => normalize(h) === normalize(choice.label))
  );

  const handleCardSelect = (label: string) => {
    if (clickSelectionMode !== null) {
      if (submitted) return;
      // Mode clic : sélection multiple jusqu'à 2, le bouton Valider envoie ensuite
      setClickSelected((prev) => {
        if (prev.includes(label)) return prev.filter((l) => l !== label);
        if (prev.length >= 2) return prev;
        return [...prev, label];
      });
    } else {
      // Mode voix : sélection visuelle simple (pas d'action)
      setSelected(label);
    }
  };

  const handleValidate = () => {
    if (clickSelected.length !== 2 || submitted) return;
    setSubmitted(true);
    submitClickAnswer(clickSelected);
  };

  return (
    <div className="relative w-full max-w-5xl flex-1 min-h-0 flex flex-col gap-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 w-full py-2 flex-1 min-h-0 max-h-[52vh] sm:max-h-[48vh]">
        {visibleChoices.map((choice) => (
          <ChoiceCard
            key={choice.label}
            name={choice.label}
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
        ))}
      </div>
      {clickSelectionMode !== null && clickSelected.length === 2 && (
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
