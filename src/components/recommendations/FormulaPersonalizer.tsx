"use client";

import { useState } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { useTranslation } from "@/i18n/LanguageContext";
import { FormulaNote } from "@/context/SessionContext";
import { activeBrand } from "@/lib/brand";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const isEster = activeBrand.id === "ester";

interface FormulaPersonalizerProps {
  /** Formule complète (top_notes/heart_notes/base_notes + sizes), au format backend. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formula: any;
  language: "fr" | "en";
  /** Appelée avec la formule mise à jour après un remplacement de note réussi. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFormulaChange: (formula: any) => void;
  /** Note actuellement mise en avant (bouton "modifier" cliqué sur la carte de gauche) —
   * null tant qu'aucun bouton n'a été cliqué : la section reste vide/invite. */
  activeNote: { noteType: "top" | "heart" | "base"; note: FormulaNote } | null;
  className?: string;
  /** Référence déjà sauvegardée en base pour cette formule — si fournie, le remplacement
   * de note est aussi répercuté sur l'enregistrement existant côté backend. */
  reference?: string;
}

/**
 * Affiche, pour la note actuellement sélectionnée sur la carte formule (bouton "modifier"
 * cliqué dans FormulaCard), ses jusqu'à 2 alternatives proposées par le LLM à la
 * génération. Cliquer une alternative appelle POST /api/formulas/replace-note
 * (recalcule le booster) et remonte la formule mise à jour au parent.
 */
export default function FormulaPersonalizer({ formula, language, onFormulaChange, activeNote, className, reference }: FormulaPersonalizerProps) {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  const handleReplace = async (newNote: string) => {
    if (!activeNote) return;
    setPending(true);
    setError(false);
    try {
      const res = await fetch(`${API_BASE}/api/formulas/replace-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formula,
          note_type: activeNote.noteType,
          old_note: activeNote.note.name,
          new_note: newNote,
          language,
          reference: reference || null,
        }),
      });
      if (!res.ok) { setError(true); return; }
      const data = await res.json();
      onFormulaChange(data.formula);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  };

  if (!activeNote) {
    return (
      <div className={className ?? "h-full flex flex-col items-center justify-center gap-2 p-3.5 sm:p-4 text-center"}>
        <MaterialIcon name="swap_horiz" className={`text-[28px] ${isEster ? "text-primary" : "text-primary/100"}`} />
        <p className={`text-xs max-w-[220px] ${isEster ? "text-primary font-medium" : "text-primary/100"}`}>{t("formulaPersonalizer.invite")}</p>
      </div>
    );
  }

  const { note } = activeNote;
  const alternatives = note.alternatives ?? [];

  return (
    <div className={className ?? "h-full flex flex-col gap-3 p-3.5 sm:p-4"}>
      <div>
        <span className="brand-text text-primary/60 block mb-1 text-[0.6rem]">
          {t("formulaPersonalizer.currentNote")}
        </span>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-primary bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium text-primary truncate">{note.name}</span>
          <span className="text-sm font-medium text-primary shrink-0">{note.ml} ml</span>
        </div>
      </div>

      {alternatives.length > 0 ? (
        <div>
          <span className="brand-text text-primary/60 block mb-1.5 text-[0.6rem]">
            {t("formulaPersonalizer.alternatives")}
          </span>
          <div className="flex flex-col gap-2">
            {alternatives.map((alt) => (
              <button
                key={alt.name}
                onClick={() => handleReplace(alt.name)}
                disabled={pending}
                className="flex items-center justify-between gap-2 rounded-lg border-2 border-primary/20 bg-[#fcfaf8] px-3.5 py-3 text-left hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  {pending
                    ? <div className="size-4 shrink-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    : <MaterialIcon name="swap_horiz" className="text-[18px] shrink-0 text-primary/70" />
                  }
                  <span className="text-sm font-medium text-[#4f443e] truncate">{alt.name}</span>
                </span>
                <span className="text-sm font-semibold text-primary shrink-0">{alt.ml} ml</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-primary/40 text-center">{t("formulaPersonalizer.noAlternatives")}</p>
      )}

      {error && (
        <p className="text-xs text-red-500 text-center">{t("formulaPersonalizer.error")}</p>
      )}
    </div>
  );
}
