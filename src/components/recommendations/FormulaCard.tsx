"use client";

import { useState } from "react";
import SizeToggle, { SizeOption } from "./SizeToggle";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { FormulaSize, FormulaNote } from "@/context/SessionContext";
import { useTranslation } from "@/i18n/LanguageContext";

interface FormulaCardProps {
  name: string;
  sizes: {
    "10ml": FormulaSize;
    "30ml": FormulaSize;
    "50ml": FormulaSize;
  };
  variant?: "default" | "comparison";
  className?: string;
  selectedSize?: SizeOption;
  onSelectedSizeChange?: (size: SizeOption) => void;
  /** Fourni uniquement dans l'écran de personnalisation : affiche un bouton "modifier" à
   * côté de chaque note (sauf les boosters), qui remonte la note cliquée au parent. */
  onNoteEdit?: (noteType: "top" | "heart" | "base", note: FormulaNote) => void;
  /** Nom de la note actuellement mise en avant (dont les alternatives sont affichées à
   * côté) — surlignée pour indiquer quelle note est en cours de modification. */
  activeNoteName?: string | null;
  /** "lg" agrandit le texte des notes — utilisé sur les écrans plein page où la carte
   * n'est pas contrainte à un espace compact (ex. /formulas). */
  size?: "default" | "lg";
}

const MAX_NOTES = 3;

function NoteList({
  label,
  notes,
  variant,
  noteType,
  onNoteEdit,
  activeNoteName,
  size = "default",
}: {
  label: string;
  notes: FormulaNote[];
  variant: "default" | "comparison";
  noteType?: "top" | "heart" | "base";
  onNoteEdit?: (noteType: "top" | "heart" | "base", note: FormulaNote) => void;
  activeNoteName?: string | null;
  size?: "default" | "lg";
}) {
  if (notes.length === 0) return null;
  const visible = notes.slice(0, MAX_NOTES);
  const isLarge = size === "lg";

  return (
    <section
      className={`min-w-0 rounded-lg border ${
        variant === "comparison"
          ? "border-primary/12 bg-[#fcfaf8] px-1.5 sm:px-3 py-1.5 sm:py-2.5"
          : "border-transparent"
      }`}
    >
      <span
        className={`brand-text text-primary block ${
          variant === "comparison"
            ? "mb-1 sm:mb-2 text-[0.55rem] sm:text-[0.68rem]"
            : isLarge
              ? "mb-1.5 text-sm"
              : "mb-0.5 text-[0.65rem] sm:text-xs"
        }`}
      >
        {label}
      </span>
      <ul className="space-y-0">
        {visible.map((note) => (
          <li
            key={note.name}
            className={`flex items-center justify-between gap-1.5 sm:gap-3 min-w-0 ${
              variant === "comparison"
                ? "py-0.5 sm:py-1 text-[#4f443e] border-b border-primary/8 last:border-b-0"
                : isLarge
                  ? "py-1.5 text-gray-600"
                  : "text-gray-600"
            } ${activeNoteName === note.name ? "text-primary font-medium" : ""}`}
          >
            <span
              className={`min-w-0 truncate ${
                variant === "comparison" ? "text-xs sm:text-[0.95rem]" : isLarge ? "text-lg" : "text-xs sm:text-sm"
              }`}
            >
              {note.name}
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <span
                className={`font-medium ${
                  variant === "comparison"
                    ? "text-primary text-xs sm:text-[0.95rem]"
                    : isLarge
                      ? "text-primary/70 text-lg"
                      : "text-primary/70 text-xs sm:text-sm"
                }`}
              >
                {note.ml} ml
              </span>
              {onNoteEdit && noteType && note.alternatives && note.alternatives.length > 0 && (
                <button
                  onClick={() => onNoteEdit(noteType, note)}
                  title={note.name}
                  className={`flex items-center justify-center size-7 rounded-full border transition-all ${
                    activeNoteName === note.name
                      ? "bg-primary border-primary text-white"
                      : "border-primary/25 text-primary/70 hover:border-primary hover:text-primary hover:bg-primary/10"
                  }`}
                >
                  <MaterialIcon name="swap_horiz" className="text-[16px]" />
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function FormulaCard({
  name,
  sizes,
  variant = "default",
  className = "",
  selectedSize: controlledSelectedSize,
  onSelectedSizeChange,
  onNoteEdit,
  activeNoteName,
  size = "default",
}: FormulaCardProps) {
  const [uncontrolledSelectedSize, setUncontrolledSelectedSize] = useState<SizeOption>("30ml");
  const { t } = useTranslation();
  const selectedSize = controlledSelectedSize ?? uncontrolledSelectedSize;
  const handleSelectedSizeChange = (size: SizeOption) => {
    if (controlledSelectedSize === undefined) {
      setUncontrolledSelectedSize(size);
    }
    onSelectedSizeChange?.(size);
  };
  const sizeData = sizes[selectedSize];
  const isComparison = variant === "comparison";

  return (
    <div
      className={`min-w-0 bg-white border rounded-xl card-shadow flex flex-col transition-transform hover:scale-[1.01] ${
        isComparison
          ? "border-primary/20 p-2 sm:p-4"
          : "border-secondary/30 p-2 sm:p-3"
      } ${className}`}
    >
      <div className={`${isComparison ? "mb-1.5 sm:mb-3 pb-1.5 sm:pb-2.5 border-b border-primary/10" : "mb-1 sm:mb-2"}`}>
        {isComparison && (
          <p className="brand-text text-[0.55rem] sm:text-[0.68rem] text-primary/70 text-center mb-1 sm:mb-2">
            {t("formula.recommendedFormula")}
          </p>
        )}
        <h2
          className={`luxury-title text-primary text-center shrink-0 ${
            isComparison ? "text-sm sm:text-xl leading-tight" : "text-base sm:text-lg"
          }`}
        >
          {name}
        </h2>
      </div>

      <div
        className={`text-sm ${
          isComparison
            ? "flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-1 sm:gap-2"
            : "flex flex-col gap-1 sm:gap-2"
        }`}
      >
        <NoteList
          label={t("recommendations.noteLabels.top")}
          notes={sizeData.top_notes}
          variant={variant}
          noteType="top"
          onNoteEdit={onNoteEdit}
          activeNoteName={activeNoteName}
          size={size}
        />
        <NoteList
          label={t("recommendations.noteLabels.heart")}
          notes={sizeData.heart_notes}
          variant={variant}
          noteType="heart"
          onNoteEdit={onNoteEdit}
          activeNoteName={activeNoteName}
          size={size}
        />
        <NoteList
          label={t("recommendations.noteLabels.base")}
          notes={sizeData.base_notes}
          variant={variant}
          noteType="base"
          onNoteEdit={onNoteEdit}
          activeNoteName={activeNoteName}
          size={size}
        />
        <NoteList
          label={t("recommendations.noteLabels.boosters")}
          notes={sizeData.boosters}
          variant={variant}
          size={size}
        />
      </div>

      <SizeToggle selected={selectedSize} onSelect={handleSelectedSizeChange} />
    </div>
  );
}
