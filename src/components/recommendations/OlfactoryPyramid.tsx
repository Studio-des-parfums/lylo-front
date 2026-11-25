"use client";

import type { CSSProperties } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { FormulaNote, FormulaSize } from "@/context/SessionContext";
import { useTranslation } from "@/i18n/LanguageContext";

type NoteType = "top" | "heart" | "base";

interface OlfactoryPyramidProps {
  /** Composition de la taille sélectionnée (les ml en dépendent). */
  sizeData: FormulaSize;
  /** Clic sur une note qui a des alternatives : ouvre la personnalisation côté parent. */
  onNoteEdit?: (noteType: NoteType, note: FormulaNote) => void;
  activeNoteName?: string | null;
  className?: string;
}

/**
 * Pyramide olfactive en 3 étages (tête / cœur / fond). Chaque étage est une tranche d'un
 * même triangle (clip-path), et ses notes sont réparties à gauche et à droite, reliées à
 * l'étage par un trait fléché.
 *
 * Largeur de la pyramide pilotée par --pw : les traits s'enfoncent dans la colonne centrale
 * jusqu'au bord oblique de chaque étage (mesuré à mi-hauteur), d'où les coefficients
 * TIERS[].inset — fraction de --pw entre le bord de la colonne et le bord de l'étage.
 */
const TIERS: { type: NoteType; clip: string; inset: number; surface: string; label: string }[] = [
  {
    type: "top",
    clip: "polygon(50% 0, 66.667% 100%, 33.333% 100%)",
    inset: 5 / 12,
    surface: "bg-secondary",
    label: "text-primary items-end pb-2",
  },
  {
    type: "heart",
    clip: "polygon(33.333% 0, 66.667% 0, 83.333% 100%, 16.667% 100%)",
    inset: 3 / 12,
    surface: "bg-primary/65",
    label: "text-white items-center",
  },
  {
    type: "base",
    clip: "polygon(16.667% 0, 83.333% 0, 100% 100%, 0 100%)",
    inset: 1 / 12,
    surface: "bg-primary",
    label: "text-white items-center",
  },
];

const CONNECTOR_GAP_PX = 6;

function NoteChip({
  note,
  noteType,
  onNoteEdit,
  active,
}: {
  note: FormulaNote;
  noteType: NoteType;
  onNoteEdit?: (noteType: NoteType, note: FormulaNote) => void;
  active: boolean;
}) {
  const editable = !!onNoteEdit && !!note.alternatives && note.alternatives.length > 0;
  const content = (
    <>
      <span className="min-w-0 truncate text-xs sm:text-sm font-medium text-[#4f443e]">{note.name}</span>
      <span className="shrink-0 text-xs sm:text-sm font-semibold text-primary">{note.ml} ml</span>
      {editable && (
        <MaterialIcon name="swap_horiz" className={`shrink-0 text-[14px] ${active ? "text-white" : "text-primary/60"}`} />
      )}
    </>
  );
  const base = "flex max-w-full items-center gap-1.5 rounded-full border px-2.5 sm:px-3 py-1";

  if (!editable) {
    return <div className={`${base} border-primary/15 bg-white/80`}>{content}</div>;
  }
  return (
    <button
      type="button"
      onClick={() => onNoteEdit!(noteType, note)}
      title={note.name}
      className={`${base} transition-all ${
        active
          ? "border-primary bg-primary [&_span]:text-white"
          : "border-primary/25 bg-white shadow-sm hover:border-primary hover:bg-primary/5"
      }`}
    >
      {content}
    </button>
  );
}

function SideNotes({
  notes,
  noteType,
  side,
  inset,
  onNoteEdit,
  activeNoteName,
}: {
  notes: FormulaNote[];
  noteType: NoteType;
  side: "left" | "right";
  inset: number;
  onNoteEdit?: (noteType: NoteType, note: FormulaNote) => void;
  activeNoteName?: string | null;
}) {
  if (notes.length === 0) return <div />;
  const isLeft = side === "left";
  // Le trait déborde dans la colonne centrale jusqu'au bord oblique de l'étage.
  const reach: CSSProperties = isLeft
    ? { marginRight: `calc(var(--pw) * -${inset} + ${CONNECTOR_GAP_PX}px)` }
    : { marginLeft: `calc(var(--pw) * -${inset} + ${CONNECTOR_GAP_PX}px)` };

  return (
    <div className={`flex min-w-0 items-center ${isLeft ? "flex-row" : "flex-row-reverse"}`} style={reach}>
      <div className={`flex min-w-0 flex-col gap-1.5 ${isLeft ? "items-end" : "items-start"}`}>
        {notes.map((note) => (
          <NoteChip
            key={note.name}
            note={note}
            noteType={noteType}
            onNoteEdit={onNoteEdit}
            active={activeNoteName === note.name}
          />
        ))}
      </div>
      {/* Trait fléché vers l'étage */}
      <div className={`flex min-w-6 flex-1 items-center ${isLeft ? "flex-row ml-2" : "flex-row-reverse mr-2"}`}>
        <span className="h-px flex-1 bg-primary/40" />
        <span
          className={`size-0 border-y-[4px] border-y-transparent ${
            isLeft ? "border-l-[6px] border-l-primary/60" : "border-r-[6px] border-r-primary/60"
          }`}
        />
      </div>
    </div>
  );
}

export default function OlfactoryPyramid({ sizeData, onNoteEdit, activeNoteName, className = "" }: OlfactoryPyramidProps) {
  const { t } = useTranslation();
  const notesByType: Record<NoteType, FormulaNote[]> = {
    top: sizeData.top_notes,
    heart: sizeData.heart_notes,
    base: sizeData.base_notes,
  };

  return (
    <div
      className={`w-full [--pw:150px] sm:[--pw:240px] grid grid-cols-[minmax(0,1fr)_var(--pw)_minmax(0,1fr)] gap-y-1 ${className}`}
    >
      {TIERS.map((tier) => {
        const notes = notesByType[tier.type];
        // Répartition alternée : 1re note à gauche, 2e à droite, 3e à gauche…
        const left = notes.filter((_, i) => i % 2 === 0);
        const right = notes.filter((_, i) => i % 2 === 1);
        return (
          <div key={tier.type} className="contents">
            <SideNotes
              notes={left}
              noteType={tier.type}
              side="left"
              inset={tier.inset}
              onNoteEdit={onNoteEdit}
              activeNoteName={activeNoteName}
            />
            <div
              className={`relative z-10 flex h-20 sm:h-24 justify-center ${tier.surface} ${tier.label}`}
              style={{ clipPath: tier.clip }}
            >
              <span className="brand-text text-[0.65rem] sm:text-xs font-bold uppercase tracking-[0.2em]">
                {t(`pyramid.${tier.type}`)}
              </span>
            </div>
            <SideNotes
              notes={right}
              noteType={tier.type}
              side="right"
              inset={tier.inset}
              onNoteEdit={onNoteEdit}
              activeNoteName={activeNoteName}
            />
          </div>
        );
      })}

      {sizeData.boosters.length > 0 && (
        <p className="col-span-3 mt-2 text-center text-xs text-primary/70">
          <span className="brand-text mr-1.5">{t("recommendations.noteLabels.boosters")}</span>
          {sizeData.boosters.map((b) => `${b.name} ${b.ml} ml`).join(" · ")}
        </p>
      )}
    </div>
  );
}
