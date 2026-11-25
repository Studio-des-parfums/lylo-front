"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import MaterialIcon from "@/components/ui/MaterialIcon";
import FormulaCard from "@/components/recommendations/FormulaCard";
import { SimilarPerfume } from "@/components/recommendations/SimilarPerfumesButton";
import CatalogFormulaCard from "@/components/recommendations/CatalogFormulaCard";
import MoodboardButton, { MOODBOARD_ENABLED } from "@/components/recommendations/MoodboardButton";
import FormulaQrCode from "@/components/recommendations/FormulaQrCode";
import PrintableFormula from "@/components/recommendations/PrintableFormula";
import FormulaPersonalizer from "@/components/recommendations/FormulaPersonalizer";
import SendFormulaMailButton from "@/components/recommendations/SendFormulaMailButton";
import OlfactoryPyramid from "@/components/recommendations/OlfactoryPyramid";
import SimilarPerfumesButton from "@/components/recommendations/SimilarPerfumesButton";
import SizeToggle from "@/components/recommendations/SizeToggle";
import { SizeOption } from "@/components/recommendations/SizeToggle";
import { useTranslation } from "@/i18n/LanguageContext";
import { FormulaSize, FormulaNote } from "@/context/SessionContext";
import { PARTICIPANT_COLORS } from "@/components/configure/ConfigPanel";
import { persistLanguage, resolveStoredLanguage } from "@/lib/language";
import { createShareableFormula } from "@/lib/shareableFormula";
import { activeBrand } from "@/lib/brand";

const isEster = activeBrand.id === "ester";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface Formula {
  // Lylo — formule générée sur-mesure
  profile: string;
  description?: string;
  formula_type?: string;
  top_notes?: string[];
  heart_notes?: string[];
  base_notes?: string[];
  sizes?: {
    "10ml": FormulaSize;
    "30ml": FormulaSize;
    "50ml": FormulaSize;
  };
  session_id?: string;
  // Ester — parfum sélectionné dans le catalogue
  source?: "catalog";
  brand?: string;
  name?: string;
  family?: string;
  match_reason?: string;
  image_url?: string;
  moodboard_image_url?: string | null;
}

function isCatalogFormula(formula: Formula): boolean {
  return formula.source === "catalog";
}

function renderFormula(
  formula: Formula,
  opts: {
    variant: "default" | "comparison";
    className?: string;
    selectedSize: SizeOption;
    onSelectedSizeChange: (size: SizeOption) => void;
    onNoteEdit?: (noteType: "top" | "heart" | "base", note: FormulaNote) => void;
    activeNoteName?: string | null;
    similarPerfumes?: {
      cached: SimilarPerfume[] | undefined;
      onFetch: () => Promise<void>;
      loading: boolean;
      error: boolean;
    };
  }
) {
  if (isCatalogFormula(formula)) {
    return (
      <CatalogFormulaCard
        brand={formula.brand ?? ""}
        name={formula.name ?? ""}
        family={formula.family}
        topNotes={formula.top_notes}
        heartNotes={formula.heart_notes}
        baseNotes={formula.base_notes}
        matchReason={formula.match_reason}
        imageUrl={formula.image_url}
        variant={opts.variant}
        className={opts.className}
      />
    );
  }
  return (
    <FormulaCard
      name={formula.profile}
      sizes={formula.sizes!}
      variant={opts.variant}
      className={opts.className}
      selectedSize={opts.selectedSize}
      onSelectedSizeChange={opts.onSelectedSizeChange}
      onNoteEdit={opts.onNoteEdit}
      activeNoteName={opts.activeNoteName}
      similarPerfumes={opts.similarPerfumes}
    />
  );
}

// ── Parcours d'une personne : choix d'une formule → pyramide + personnalisation + actions ──
// Utilisé tel quel en solo, et une fois par personne en mode duo (participant renseigné).

interface JourneyParticipant {
  color: string;
  index: number;
  total: number;
}

function FormulaJourney({
  initialFormulas,
  participant,
  onExit,
  onFinish,
}: {
  initialFormulas: Formula[];
  participant?: JourneyParticipant;
  /** "Retour à l'accueil" : quitte le parcours sans terminer. */
  onExit: () => void;
  /** Duo uniquement : "Passer à la personne suivante" / "Terminer". */
  onFinish?: () => void;
}) {
  const { t } = useTranslation();
  const [formulas, setFormulas] = useState<Formula[]>(initialFormulas);
  const colorDef = participant ? PARTICIPANT_COLORS.find((c) => c.id === participant.color) : undefined;
  const isLastParticipant = !!participant && participant.index === participant.total - 1;
  const [chosen, setChosen] = useState<number | null>(null);
  // Passe à true au clic sur "Continuer" — affiche l'écran final (formule + personnalisation
  // + actions), à la place du récap immédiat après sélection d'une carte.
  const [confirmed, setConfirmed] = useState(false);
  const [reference, setReference] = useState<string>("");
  const [savingReference, setSavingReference] = useState(false);
  // Échec de POST /formulas/save : sans référence, l'envoi par mail est impossible —
  // on l'affiche avec un bouton "Réessayer" plutôt que de masquer silencieusement le bouton mail.
  const [referenceError, setReferenceError] = useState(false);
  // Référence déjà obtenue pour une formule (par index) — évite de recréer une nouvelle
  // entrée en base (et une nouvelle référence) quand l'utilisateur revient sur une carte
  // déjà choisie après avoir consulté l'autre.
  const [referencesByIndex, setReferencesByIndex] = useState<Record<number, string>>({});
  const [language, setLanguage] = useState("fr");
  const [selectedSizes, setSelectedSizes] = useState<Record<number, SizeOption>>({});
  // Note actuellement mise en avant (bouton "modifier" cliqué sur la carte formule) — pilote
  // le contenu de la section de droite (FormulaPersonalizer). Réinitialisée à chaque retour
  // aux choix ou changement de taille, pour ne jamais pointer vers une note obsolète.
  const [activeNote, setActiveNote] = useState<{ noteType: "top" | "heart" | "base"; note: FormulaNote } | null>(null);
  // Parfums du commerce ressemblants, mis en cache par index de formule — évite de relancer
  // la recherche (LLM + web) quand l'utilisateur navigue entre formules pendant la session.
  const [similarPerfumesByIndex, setSimilarPerfumesByIndex] = useState<Record<number, SimilarPerfume[]>>({});
  const [similarPerfumesLoading, setSimilarPerfumesLoading] = useState<Record<number, boolean>>({});
  const [similarPerfumesError, setSimilarPerfumesError] = useState<Record<number, boolean>>({});

  // La génération des moodboards démarre déjà côté back, en tâche de fond, dès
  // POST /api/formulas/generate (voir _queue_moodboards côté sessions.py).
  useEffect(() => {
    const storedLanguage = resolveStoredLanguage();
    persistLanguage(storedLanguage);
    setLanguage(storedLanguage);
  }, []);

  const handleChoose = async (index: number) => {
    setChosen(index);

    const existingReference = referencesByIndex[index];
    if (existingReference) {
      setReference(existingReference);
      return;
    }

    const formula = formulas[index];
    setReference("");
    setReferenceError(false);
    setSavingReference(true);
    try {
      const res = await fetch(`${API_BASE}/api/formulas/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formula,
          customer_email: localStorage.getItem("recap_email") || null,
          customer_name: localStorage.getItem("recap_name") || null,
          participant_color: participant?.color ?? null,
          language: resolveStoredLanguage(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reference) {
          setReference(data.reference);
          setReferencesByIndex((prev) => ({ ...prev, [index]: data.reference }));
        } else {
          setReferenceError(true);
        }
      } else {
        setReferenceError(true);
      }
    } catch {
      setReferenceError(true);
    }
    finally { setSavingReference(false); }
  };

  if (formulas.length === 0) return null;
  const selectedFormula = chosen !== null ? formulas[chosen] : null;

  // Après un remplacement de note (POST /api/formulas/replace-note), met à jour la formule
  // sélectionnée dans le state local — la reference en base garde volontairement l'ancienne
  // composition tant que l'utilisateur ne relance pas un envoi/impression explicite.
  const handleFormulaReplaced = (index: number, updatedFormula: Formula) => {
    setFormulas((current) => {
      const next = [...current];
      next[index] = updatedFormula;
      return next;
    });
    // La note remplacée n'a plus d'alternatives (non redemandées au LLM) — on vide la
    // sélection plutôt que d'afficher "aucune alternative" pour la nouvelle note.
    setActiveNote(null);
  };

  const handleFormulaSizeChange = (formulaIndex: number, size: SizeOption) => {
    setSelectedSizes((current) => ({
      ...current,
      [formulaIndex]: size,
    }));
  };

  const fetchSimilarPerfumes = async (index: number) => {
    const formula = formulas[index];
    setSimilarPerfumesLoading((current) => ({ ...current, [index]: true }));
    setSimilarPerfumesError((current) => ({ ...current, [index]: false }));
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
      if (!res.ok) { setSimilarPerfumesError((current) => ({ ...current, [index]: true })); return; }
      const data = await res.json();
      setSimilarPerfumesByIndex((current) => ({ ...current, [index]: data.similar_perfumes ?? [] }));
    } catch {
      setSimilarPerfumesError((current) => ({ ...current, [index]: true }));
    } finally {
      setSimilarPerfumesLoading((current) => ({ ...current, [index]: false }));
    }
  };

  return (
    <div
      className="relative min-h-dvh w-full flex flex-col bg-background-light overflow-hidden"
    >
      {/* Duo : la couleur de la personne n'est plus le fond de page (texte marque peu lisible
          sur certains pastels) mais un liseré en haut d'écran + la pastille du bandeau. */}
      {colorDef && (
        <div className="fixed inset-x-0 top-0 z-40 h-2" style={{ backgroundColor: colorDef.text }} />
      )}
      <Navbar showActions={false} transparent />
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-warm-cream rounded-full blur-[100px]" />
      </div>
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 py-5 pb-8 relative z-10 max-w-4xl mx-auto w-full gap-4">
        {participant && (
          // Bandeau de la personne : barre à sa couleur, textes dans des encadrés blancs (lisibles
          // quelle que soit la couleur).
          <div
            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl shadow-sm ${confirmed ? "mt-12" : ""}`}
            style={{ backgroundColor: colorDef?.bg ?? "#eee" }}
          >
            <div className="flex min-w-0 items-center gap-2 rounded-lg bg-white px-3 py-1.5 shadow-sm">
              <span className="inline-block size-3 shrink-0 rounded-full" style={{ backgroundColor: colorDef?.text ?? "#333" }} />
              <span className="truncate font-bold text-sm tracking-wide text-primary">
                {t("quizResults.chooseYourFormula").replace("{name}", colorDef ? t(colorDef.labelKey) : participant.color)}
              </span>
            </div>
            <span className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-primary shadow-sm">
              {participant.index + 1} / {participant.total}
            </span>
          </div>
        )}
        {!confirmed && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="h-px w-6 bg-primary/40" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">{t(isEster ? "quiz.resultsLabelCatalog" : "quiz.resultsLabel")}</span>
              <span className="h-px w-6 bg-primary/40" />
            </div>
            <h1 className="text-primary tracking-tight text-2xl sm:text-3xl font-bold mb-1.5 font-display">
              {chosen === null ? t(isEster ? "quiz.resultsTitleCatalog" : "quiz.resultsTitle") : t(isEster ? "quiz.resultsTitleChosenCatalog" : "quiz.resultsTitleChosen")}
            </h1>
            <p className="text-primary/60 text-xs sm:text-sm font-medium">
              {chosen === null ? t(isEster ? "quiz.resultsSubtitleCatalog" : "quiz.resultsSubtitle") : t("quiz.resultsSubtitleChosen")}
            </p>
          </div>
        )}

        {chosen === null && (
          <div className="w-full flex flex-row flex-wrap items-stretch justify-center gap-2 sm:gap-6">
            {formulas.map((formula, i) => (
              <div
                key={i}
                onClick={() => handleChoose(i)}
                className="w-full max-w-[340px] h-[min(58vh,720px)] sm:h-[min(68vh,720px)] cursor-pointer rounded-xl border-2 border-transparent hover:border-primary transition-all hover:scale-[1.02] overflow-hidden relative shadow-md"
              >
                {renderFormula(formula, {
                  variant: "comparison",
                  className: "h-full",
                  selectedSize: selectedSizes[i] ?? "30ml",
                  onSelectedSizeChange: (size) => handleFormulaSizeChange(i, size),
                })}
              </div>
            ))}
          </div>
        )}

        {chosen !== null && selectedFormula && !confirmed && (
          <>
            <div className="w-full flex flex-row flex-wrap items-stretch justify-center gap-2 sm:gap-6">
              {formulas.map((formula, i) => (
                <div
                  key={i}
                  onClick={() => { setChosen(null); }}
                  className={`w-full max-w-[320px] h-[min(48vh,620px)] sm:h-[min(56vh,620px)] rounded-xl border-2 overflow-hidden relative shadow-md transition-all duration-300 ${
                    chosen === i
                      ? "border-primary scale-[1.02] cursor-default"
                      : "border-transparent opacity-30 scale-[0.97] cursor-pointer"
                  }`}
                >
                  {renderFormula(formula, {
                    variant: "comparison",
                    className: "h-full",
                    selectedSize: selectedSizes[i] ?? "30ml",
                    onSelectedSizeChange: (size) => handleFormulaSizeChange(i, size),
                  })}
                  {chosen === i && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-primary/90 rounded-full p-3 shadow-xl">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className={`text-xs text-center ${isEster ? "text-primary font-medium" : "text-primary/40"}`}>{t("quizResults.tapOtherCard")}</p>
            <button
              onClick={() => setConfirmed(true)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:brightness-110 transition-all"
            >
              {t("quizResults.continue")}
              <MaterialIcon name="arrow_forward" className="text-[18px]" />
            </button>
          </>
        )}

        {chosen !== null && selectedFormula && confirmed && (
          <>
            {/* pt- : sans le header masqué au-dessus (voir !confirmed plus haut), ce bloc
                remonte sous la navbar fixed/transparente, qui intercepte alors les clics
                sur le bouton retour même si elle est invisible — voir Navbar.tsx (fixed z-50). */}
            <div className={`w-full ${participant ? "" : "pt-14"} flex items-center justify-center relative`}>
              <button
                onClick={() => { setConfirmed(false); setActiveNote(null); }}
                title={t("quizResults.backToChoices")}
                className="absolute left-0 flex items-center justify-center size-8 rounded-full text-primary hover:bg-primary/10 transition-all"
              >
                <MaterialIcon name="arrow_back" className="text-[20px]" />
              </button>
              <h2 className="text-primary text-xl sm:text-2xl font-bold font-display text-center">
                {t("quizResults.personalizeTitle")}
              </h2>
            </div>
            {!isCatalogFormula(selectedFormula) && selectedFormula.description && (
              <p className="text-sm text-primary italic text-center max-w-2xl">
                {selectedFormula.description}
              </p>
            )}
            {isCatalogFormula(selectedFormula) ? (
              <div className="w-full sm:max-w-[380px] min-h-[280px]">
                {renderFormula(selectedFormula, {
                  variant: "default",
                  className: "h-full",
                  selectedSize: selectedSizes[chosen] ?? "30ml",
                  onSelectedSizeChange: (size) => handleFormulaSizeChange(chosen, size),
                })}
              </div>
            ) : (
              <div className="relative w-full max-w-3xl flex flex-col items-center gap-3 pt-2">
                <div className="relative z-30 flex w-full items-center justify-center gap-2">
                  <h3 className="luxury-title text-primary text-lg sm:text-xl text-center">{selectedFormula.profile}</h3>
                  {/* SimilarPerfumesButton se positionne en absolute top/right de son parent */}
                  <div className="relative size-7 shrink-0">
                    <SimilarPerfumesButton
                      cached={similarPerfumesByIndex[chosen]}
                      onFetch={() => fetchSimilarPerfumes(chosen)}
                      loading={similarPerfumesLoading[chosen] ?? false}
                      error={similarPerfumesError[chosen] ?? false}
                    />
                  </div>
                </div>
                <OlfactoryPyramid
                  sizeData={selectedFormula.sizes![selectedSizes[chosen] ?? "30ml"]}
                  onNoteEdit={(noteType, note) => setActiveNote({ noteType, note })}
                  activeNoteName={activeNote?.note.name ?? null}
                />
                <p className="text-[11px] text-primary/50 text-center">{t("pyramid.hint")}</p>
                <div className="w-full max-w-xs">
                  <SizeToggle
                    selected={selectedSizes[chosen] ?? "30ml"}
                    onSelect={(size) => { handleFormulaSizeChange(chosen, size); setActiveNote(null); }}
                  />
                </div>
              </div>
            )}

            {/* Personnalisation d'une note : ouverte au clic sur une note de la pyramide,
                refermée automatiquement après remplacement (handleFormulaReplaced vide activeNote). */}
            {activeNote && !isCatalogFormula(selectedFormula) && (
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
                    formula={selectedFormula}
                    language={language as "fr" | "en" | "es" | "de" | "ar" | "ru"}
                    onFormulaChange={(updated) => handleFormulaReplaced(chosen, updated)}
                    activeNote={activeNote}
                    reference={reference || undefined}
                    className="flex flex-col gap-3 p-4 pt-10"
                  />
                </div>
              </div>
            )}
            <div className="w-full flex flex-col items-center gap-2.5">
              {savingReference ? (
                <div className="flex items-center justify-center gap-2 text-primary/70 text-sm py-2">
                  <span className="size-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  {t("quizResults.referenceLoading")}
                </div>
              ) : reference && (
                <div className="flex flex-col items-center gap-1 text-center">
                  <span className="font-mono font-bold text-primary text-2xl sm:text-3xl tracking-wide">
                    {reference}
                  </span>
                  <p className="text-sm text-primary/80">
                    {t("quizResults.giveReferenceToPerfumer")}
                  </p>
                </div>
              )}
              {!isCatalogFormula(selectedFormula) && (
                <div className="flex flex-row items-center justify-center gap-2">
                  <button
                    onClick={() => window.print()}
                    title={t("quiz.print")}
                    className="flex items-center justify-center size-9 rounded-full brand-surface border border-primary/25 text-primary shadow-sm hover:bg-primary/5 transition-all"
                  >
                    <MaterialIcon name="print" className="text-[18px]" />
                  </button>
                  <FormulaQrCode
                    formula={createShareableFormula(
                      selectedFormula.profile,
                      selectedSizes[chosen] ?? "30ml",
                      selectedFormula.sizes!,
                    )}
                    language={language as "fr" | "en" | "es" | "de" | "ar" | "ru"}
                    buttonLabel={t("recommendations.qrButton")}
                    title={t("recommendations.qrTitle")}
                    subtitle={t("recommendations.qrSubtitle")}
                    closeLabel={t("recommendations.qrClose")}
                    iconOnly
                    className="flex items-center justify-center size-9 rounded-full bg-primary text-white shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
                  />
                  {MOODBOARD_ENABLED && (
                    <MoodboardButton
                      reference={reference || undefined}
                      initialImageUrl={selectedFormula.moodboard_image_url}
                      iconOnly
                      className="flex items-center justify-center size-9 rounded-full brand-surface border border-primary/25 text-primary shadow-sm hover:bg-primary/5 transition-all"
                    />
                  )}
                  {/* Recevoir par mail : toujours visible et libellé — il nécessite la référence
                      en base, donc désactivé pendant l'enregistrement, et "Réessayer" en cas d'échec. */}
                  {reference ? (
                    <SendFormulaMailButton reference={reference} />
                  ) : referenceError ? (
                    <button
                      onClick={() => handleChoose(chosen)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full border border-red-300 bg-white text-red-600 text-xs sm:text-sm font-semibold hover:bg-red-50 transition-all"
                    >
                      <MaterialIcon name="refresh" className="text-[18px]" />
                      {t("quizResults.referenceRetry")}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-xs sm:text-sm font-semibold opacity-50 cursor-wait"
                    >
                      <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      {t("sendMail.button")}
                    </button>
                  )}
                </div>
              )}
              {onFinish ? (
                <button
                  onClick={onFinish}
                  className="mt-1 flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:brightness-110 transition-all"
                >
                  {isLastParticipant ? t("quizResults.finish") : t("quizResults.nextPerson")}
                  <MaterialIcon name={isLastParticipant ? "check" : "arrow_forward"} className="text-[18px]" />
                </button>
              ) : (
                <button
                  onClick={onExit}
                  className="text-surface opacity-50 brand-text text-[11px] hover:text-primary hover:opacity-100 transition-colors cursor-pointer py-1"
                >
                  {t("recommendations.returnHome")}
                </button>
              )}
            </div>
          </>
        )}

        {chosen === null && (
          <button
            onClick={onExit}
            className="text-surface opacity-50 brand-text text-xs hover:text-primary hover:opacity-100 transition-colors cursor-pointer py-1"
          >
            {t("recommendations.returnHome")}
          </button>
        )}
      </main>

      {selectedFormula && !isCatalogFormula(selectedFormula) && (
        <PrintableFormula
          profile={selectedFormula.profile}
          date={new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          reference={reference}
          notes={{
            top: selectedFormula.sizes![chosen !== null ? (selectedSizes[chosen] ?? "30ml") : "30ml"].top_notes,
            heart: selectedFormula.sizes![chosen !== null ? (selectedSizes[chosen] ?? "30ml") : "30ml"].heart_notes,
            base: selectedFormula.sizes![chosen !== null ? (selectedSizes[chosen] ?? "30ml") : "30ml"].base_notes,
          }}
        />
      )}
    </div>
  );
}

// ── Mode solo ─────────────────────────────────────────────────────────────

// Lecture directe du localStorage à l'initialisation : SoloResults/MultiResults ne sont
// montés qu'après le premier rendu client (voir QuizResultsPage), jamais côté serveur.
function readStoredJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function SoloResults() {
  const router = useRouter();
  const [formulas] = useState(() => readStoredJson<Formula[]>("quiz_formulas"));

  useEffect(() => {
    if (!formulas) router.push("/quiz");
  }, [formulas, router]);

  if (!formulas || formulas.length === 0) return null;
  return (
    <FormulaJourney
      initialFormulas={formulas}
      onExit={() => { localStorage.removeItem("quiz_formulas"); router.push("/"); }}
    />
  );
}

// ── Mode duo ──────────────────────────────────────────────────────────────
// Chaque personne suit à tour de rôle le même parcours que le solo (choix → pyramide →
// personnalisation → QR / mail / moodboard), puis passe la main ; la dernière termine.

interface ParticipantResult {
  color: string;
  formulas: Formula[];
}

function MultiResults() {
  const router = useRouter();
  // La génération des moodboards démarre déjà côté back, en tâche de fond, dès
  // POST /api/formulas/generate-multi (voir _queue_moodboards côté sessions.py).
  const [participants] = useState(() => readStoredJson<ParticipantResult[]>("quiz_multi_results") ?? []);
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    if (participants.length === 0) router.push("/quiz");
  }, [participants, router]);

  const exit = () => {
    localStorage.removeItem("quiz_multi_results");
    localStorage.removeItem("participant_colors");
    router.push("/");
  };

  if (participants.length === 0) return null;
  const participant = participants[currentIdx];
  const isLast = currentIdx === participants.length - 1;

  return (
    <FormulaJourney
      // key : état (choix, référence, notes remplacées…) remis à zéro pour chaque personne
      key={participant.color}
      initialFormulas={participant.formulas}
      participant={{ color: participant.color, index: currentIdx, total: participants.length }}
      onExit={exit}
      onFinish={() => {
        if (isLast) { exit(); return; }
        setCurrentIdx(currentIdx + 1);
        window.scrollTo({ top: 0 });
      }}
    />
  );
}

// ── Entry point ───────────────────────────────────────────────────────────

export default function QuizResultsPage() {
  const [isMulti, setIsMulti] = useState<boolean | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("participant_colors");
    if (raw) {
      try {
        const colors = JSON.parse(raw);
        setIsMulti(Array.isArray(colors) && colors.length > 1);
        return;
      } catch { /* fall through */ }
    }
    setIsMulti(false);
  }, []);

  if (isMulti === null) return null;
  return isMulti ? <MultiResults /> : <SoloResults />;
}
