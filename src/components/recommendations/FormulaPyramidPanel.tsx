"use client";

import { useState } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import OlfactoryPyramid from "./OlfactoryPyramid";
import FormulaPersonalizer from "./FormulaPersonalizer";
import SimilarPerfumesButton, { SimilarPerfume } from "./SimilarPerfumesButton";
import SizeToggle, { SizeOption } from "./SizeToggle";
import { FormulaNote, FormulaSize } from "@/context/SessionContext";
import { useTranslation } from "@/i18n/LanguageContext";
import { resolveStoredLanguage } from "@/lib/language";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

type Language = "fr" | "en" | "es" | "de" | "ar" | "ru";

export interface PyramidFormula {
  profile?: string;
  description?: string;
  top_notes?: string[];
  heart_notes?: string[];
  base_notes?: string[];
  sizes?: Record<SizeOption, FormulaSize>;
}

export interface SimilarPerfumesState {
  cached: SimilarPerfume[] | undefined;
  onFetch: () => Promise<void>;
  loading: boolean;
  error: boolean;
}

interface FormulaPyramidPanelProps {
  formula: PyramidFormula;
  selectedSize: SizeOption;
  onSelectedSizeChange: (size: SizeOption) => void;
  language: Language;
  /** Appelée avec la formule mise à jour après un remplacement de note. */
  onFormulaChange: (formula: PyramidFormula) => void;
  /** Référence en base : le remplacement de note y est répercuté. */
  reference?: string;
  /** Mode vocal : session en cours, tenue à jour pour l'agent lors d'un remplacement. */
  sessionId?: string;
  /** Cache des parfums ressemblants géré par le parent (ex. par formule dans le quiz) ;
   * à défaut, le panneau gère le sien. */
  similarPerfumes?: SimilarPerfumesState;
}

/**
 * Écran final d'une formule, commun au parcours visuel (quiz) et vocal : nom + parfums
 * ressemblants, pyramide olfactive (notes cliquables → remplacement en modale) et taille.
 */
export default function FormulaPyramidPanel({
  formula,
  selectedSize,
  onSelectedSizeChange,
  language,
  onFormulaChange,
  reference,
  sessionId,
  similarPerfumes,
}: FormulaPyramidPanelProps) {
  const { t } = useTranslation();
  const [activeNote, setActiveNote] = useState<{ noteType: "top" | "heart" | "base"; note: FormulaNote } | null>(null);

  const [ownSimilar, setOwnSimilar] = useState<SimilarPerfume[] | undefined>(undefined);
  const [ownSimilarLoading, setOwnSimilarLoading] = useState(false);
  const [ownSimilarError, setOwnSimilarError] = useState(false);

  const fetchOwnSimilar = async () => {
    setOwnSimilarLoading(true);
    setOwnSimilarError(false);
    try {
      const res = await fetch(`${API_BASE}/api/formulas/similar-perfumes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formula: {
            profile: formula.profile,
            description: formula.description,
            top_notes: formula.top_notes,
            heart_notes: formula.heart_notes,
            base_notes: formula.base_notes,
          },
          language: resolveStoredLanguage(),
        }),
      });
      if (!res.ok) { setOwnSimilarError(true); return; }
      const data = await res.json();
      setOwnSimilar(data.similar_perfumes ?? []);
    } catch {
      setOwnSimilarError(true);
    } finally {
      setOwnSimilarLoading(false);
    }
  };

  const similar: SimilarPerfumesState = similarPerfumes ?? {
    cached: ownSimilar,
    onFetch: fetchOwnSimilar,
    loading: ownSimilarLoading,
    error: ownSimilarError,
  };

  const sizeData = formula.sizes?.[selectedSize];
  if (!sizeData) return null;

  return (
    <>
      <div className="relative w-full max-w-3xl flex flex-col items-center gap-3 pt-2">
        {/* z-30 : la bulle des parfums ressemblants passe au-dessus de la pyramide (étages en z-10) */}
        <div className="relative z-30 flex w-full items-center justify-center gap-2">
          <h3 className="luxury-title text-primary text-lg sm:text-xl text-center">{formula.profile}</h3>
          {/* SimilarPerfumesButton se positionne en absolute top/right de son parent */}
          <div className="relative size-7 shrink-0">
            <SimilarPerfumesButton
              cached={similar.cached}
              onFetch={similar.onFetch}
              loading={similar.loading}
              error={similar.error}
            />
          </div>
        </div>
        <OlfactoryPyramid
          sizeData={sizeData}
          onNoteEdit={(noteType, note) => setActiveNote({ noteType, note })}
          activeNoteName={activeNote?.note.name ?? null}
        />
        <p className="text-[11px] text-primary/50 text-center">{t("pyramid.hint")}</p>
        <div className="w-full max-w-xs">
          <SizeToggle
            selected={selectedSize}
            onSelect={(size) => { onSelectedSizeChange(size); setActiveNote(null); }}
          />
        </div>
      </div>

      {/* Remplacement d'une note : ouvert au clic sur une note, refermé après remplacement. */}
      {activeNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setActiveNote(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-sm rounded-2xl border border-primary/10 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setActiveNote(null)}
              className="absolute right-3 top-3 text-primary/50 transition-colors hover:text-primary"
              aria-label={t("sendMail.close")}
            >
              <MaterialIcon name="close" className="text-[20px]" />
            </button>
            <FormulaPersonalizer
              formula={formula}
              language={language}
              onFormulaChange={(updated) => { onFormulaChange(updated); setActiveNote(null); }}
              activeNote={activeNote}
              reference={reference}
              sessionId={sessionId}
              className="flex flex-col gap-3 p-4 pt-10"
            />
          </div>
        </div>
      )}
    </>
  );
}
