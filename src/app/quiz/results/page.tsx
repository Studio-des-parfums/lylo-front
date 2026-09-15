"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import MaterialIcon from "@/components/ui/MaterialIcon";
import FormulaCard from "@/components/recommendations/FormulaCard";
import CatalogFormulaCard from "@/components/recommendations/CatalogFormulaCard";
import FormulaQrCode from "@/components/recommendations/FormulaQrCode";
import PrintableFormula from "@/components/recommendations/PrintableFormula";
import FormulaPersonalizer from "@/components/recommendations/FormulaPersonalizer";
import SendFormulaMailButton from "@/components/recommendations/SendFormulaMailButton";
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
    />
  );
}

// ── Mode solo ─────────────────────────────────────────────────────────────

function SoloResults() {
  const router = useRouter();
  const { t } = useTranslation();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  // Passe à true au clic sur "Continuer" — affiche l'écran final (formule + personnalisation
  // + actions), à la place du récap immédiat après sélection d'une carte.
  const [confirmed, setConfirmed] = useState(false);
  const [reference, setReference] = useState<string>("");
  const [language, setLanguage] = useState("fr");
  const [selectedSizes, setSelectedSizes] = useState<Record<number, SizeOption>>({});
  // Note actuellement mise en avant (bouton "modifier" cliqué sur la carte formule) — pilote
  // le contenu de la section de droite (FormulaPersonalizer). Réinitialisée à chaque retour
  // aux choix ou changement de taille, pour ne jamais pointer vers une note obsolète.
  const [activeNote, setActiveNote] = useState<{ noteType: "top" | "heart" | "base"; note: FormulaNote } | null>(null);

  useEffect(() => {
    const storedLanguage = resolveStoredLanguage();
    persistLanguage(storedLanguage);
    setLanguage(storedLanguage);
    const raw = localStorage.getItem("quiz_formulas");
    if (!raw) { router.push("/quiz"); return; }
    try { setFormulas(JSON.parse(raw)); } catch { router.push("/quiz"); }
  }, [router]);

  const handleChoose = async (index: number) => {
    setChosen(index);
    const formula = formulas[index];
    try {
      const res = await fetch(`${API_BASE}/api/formulas/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formula,
          customer_email: localStorage.getItem("recap_email") || null,
          customer_name: localStorage.getItem("recap_name") || null,
          language: resolveStoredLanguage(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reference) setReference(data.reference);
      }
    } catch { /* non bloquant */ }
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

  return (
    <div className="relative min-h-dvh w-full flex flex-col bg-background-light overflow-hidden">
      <Navbar showActions={false} transparent />
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-warm-cream rounded-full blur-[100px]" />
      </div>
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 py-5 pb-8 relative z-10 max-w-4xl mx-auto w-full gap-4">
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
            <div className="w-full pt-14 flex items-center justify-center relative">
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
            <div className="w-full flex-1 min-h-0 flex flex-col sm:flex-row gap-3 sm:gap-6 items-stretch justify-center">
              <div className="w-full sm:flex-1 sm:max-w-[380px] min-h-[280px] sm:min-h-0">
                {renderFormula(selectedFormula, {
                  variant: "default",
                  className: "h-full",
                  selectedSize: selectedSizes[chosen] ?? "30ml",
                  onSelectedSizeChange: (size) => { handleFormulaSizeChange(chosen, size); setActiveNote(null); },
                  onNoteEdit: (noteType, note) => setActiveNote({ noteType, note }),
                  activeNoteName: activeNote?.note.name ?? null,
                })}
              </div>
              <div className="w-full sm:flex-1 sm:max-w-[380px] min-h-[280px] sm:min-h-0 rounded-xl border border-secondary/30 bg-white card-shadow overflow-hidden">
                {!isCatalogFormula(selectedFormula) && (
                  <FormulaPersonalizer
                    formula={selectedFormula}
                    language={language as "fr" | "en"}
                    onFormulaChange={(updated) => handleFormulaReplaced(chosen, updated)}
                    activeNote={activeNote}
                  />
                )}
              </div>
            </div>
            <div className="w-full flex flex-col items-center gap-2.5">
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
                    language={language as "fr" | "en"}
                    buttonLabel={t("recommendations.qrButton")}
                    title={t("recommendations.qrTitle")}
                    subtitle={t("recommendations.qrSubtitle")}
                    closeLabel={t("recommendations.qrClose")}
                    iconOnly
                    className="flex items-center justify-center size-9 rounded-full bg-primary text-white shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
                  />
                  {reference && (
                    <SendFormulaMailButton
                      reference={reference}
                      iconOnly
                      className="flex items-center justify-center size-9 rounded-full brand-surface border border-primary/25 text-primary shadow-sm hover:bg-primary/5 transition-all"
                    />
                  )}
                </div>
              )}
              <button
                onClick={() => { localStorage.removeItem("quiz_formulas"); router.push("/"); }}
                className="text-surface opacity-50 brand-text text-[11px] hover:text-primary hover:opacity-100 transition-colors cursor-pointer py-1"
              >
                {t("recommendations.returnHome")}
              </button>
            </div>
          </>
        )}

        {chosen === null && (
          <button
            onClick={() => { localStorage.removeItem("quiz_formulas"); router.push("/"); }}
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

// ── Mode multi ────────────────────────────────────────────────────────────

interface ParticipantResult {
  color: string;
  formulas: Formula[];
}

function MultiResults() {
  const router = useRouter();
  const { t } = useTranslation();
  const [participants, setParticipants] = useState<ParticipantResult[]>([]);
  // Index du participant en train de choisir (-1 = récap final)
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [selectedSizes, setSelectedSizes] = useState<Record<string, Record<number, SizeOption>>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [references, setReferences] = useState<Record<string, string>>({});
  // Cible d'impression active (window.print()) : la couleur d'un participant, ou "all"
  // pour le bouton groupé — voir handlePrintOne/handlePrintAll.
  const [printTarget, setPrintTarget] = useState<string | "all" | null>(null);
  const language = resolveStoredLanguage();

  const RECAP = -1;

  useEffect(() => {
    const raw = localStorage.getItem("quiz_multi_results");
    if (!raw) { router.push("/quiz"); return; }
    try {
      const data: ParticipantResult[] = JSON.parse(raw);
      setParticipants(data);
    } catch { router.push("/quiz"); }
  }, [router]);

  const handleSelect = (formulaIndex: number) => {
    const participant = participants[currentIdx];
    if (!participant) return;
    const next = { ...selections, [participant.color]: formulaIndex };
    setSelections(next);
    // Avance automatiquement au participant suivant après un court délai visuel
    const nextIdx = currentIdx + 1;
    setTimeout(() => {
      setCurrentIdx(nextIdx < participants.length ? nextIdx : RECAP);
    }, 400);
  };

  const handleChange = (color: string) => {
    // Revient sur le participant qui veut changer
    const idx = participants.findIndex((p) => p.color === color);
    if (idx !== -1) {
      const next = { ...selections };
      delete next[color];
      setSelections(next);
      setCurrentIdx(idx);
      setSaveStatus("idle");
      setReferences({});
    }
  };

  const handleFormulaSizeChange = (color: string, formulaIndex: number, size: SizeOption) => {
    setSelectedSizes((current) => ({
      ...current,
      [color]: {
        ...(current[color] ?? {}),
        [formulaIndex]: size,
      },
    }));
  };

  const handleSaveAll = async () => {
    setSaveStatus("saving");
    try {
      const sel = participants.map((p) => ({
        color: p.color,
        formula: p.formulas[selections[p.color]],
      }));
      const res = await fetch(`${API_BASE}/api/formulas/save-multi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, input_mode: "quiz", selections: sel }),
      });
      if (!res.ok) throw new Error("save error");
      const data = await res.json();
      const refs: Record<string, string> = {};
      (data.saved as { color: string; reference: string }[]).forEach((s) => { refs[s.color] = s.reference; });
      setReferences(refs);
      setSaveStatus("saved");
    } catch { setSaveStatus("error"); }
  };

  // Cible d'impression : la couleur d'un participant (impression individuelle) ou "all"
  // (bouton groupé) — pilote quel(s) PrintableFormula sont visibles en @media print
  // (voir data-print-target dans le rendu et les styles associés dans globals.css).
  const handlePrintOne = (color: string) => {
    setPrintTarget(color);
    setTimeout(() => window.print(), 0);
  };

  const handlePrintAll = () => {
    setPrintTarget("all");
    setTimeout(() => window.print(), 0);
  };

  if (participants.length === 0) return null;

  // ── Étape : un participant choisit ─────────────────────────────────
  if (currentIdx !== RECAP) {
    const participant = participants[currentIdx];
    const colorDef = PARTICIPANT_COLORS.find((c) => c.id === participant.color);
    const chosen = selections[participant.color] ?? null;

    return (
      <div
        className="h-dvh w-full flex flex-col overflow-hidden transition-colors duration-500"
        style={{ backgroundColor: colorDef?.bg ?? "#f8f5f0" }}
      >
        <Navbar showActions={false} transparent />

        <main className="flex-1 flex flex-col min-h-0 px-4 pb-4 pt-2 max-w-5xl mx-auto w-full gap-3">

          {/* Bannière couleur — fond blanc, bordure et point colorés */}
          <div
            className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white shadow-sm"
            style={{ borderLeft: `4px solid ${colorDef?.text ?? "#333"}` }}
          >
            <div className="flex items-center gap-2">
              <span className="inline-block size-3 rounded-full" style={{ backgroundColor: colorDef?.text ?? "#333" }} />
              <span className="font-bold text-sm tracking-wide text-primary">
                {t("quizResults.chooseYourFormula").replace("{name}", colorDef ? t(colorDef.labelKey) : participant.color)}
              </span>
            </div>
            <span className="text-xs text-primary/40">{currentIdx + 1} / {participants.length}</span>
          </div>

          {/* Les 2 formules côte à côte — centrées, taille fixe */}
          <div className="flex-1 grid grid-cols-2 items-center justify-items-center gap-2 sm:gap-6 min-h-0">
            {participant.formulas.map((formula, i) => (
              <div
                key={i}
                onClick={() => chosen === null && handleSelect(i)}
                className={`w-full max-w-[300px] sm:max-w-[340px] h-[min(50vh,680px)] min-[480px]:h-[min(66vh,680px)] rounded-xl border-2 overflow-hidden relative shadow-md transition-all duration-300 ${
                  chosen === null ? "cursor-pointer hover:scale-[1.02]" : ""
                } ${
                  chosen === i
                    ? "scale-[1.02]"
                    : chosen !== null
                    ? "opacity-25 scale-[0.97]"
                    : ""
                }`}
                style={{ borderColor: chosen === i ? (colorDef?.text ?? "#333") : "transparent" }}
              >
                {renderFormula(formula, {
                  variant: "comparison",
                  className: "h-full",
                  selectedSize: selectedSizes[participant.color]?.[i] ?? "30ml",
                  onSelectedSizeChange: (size) => handleFormulaSizeChange(participant.color, i, size),
                })}
                {chosen === i && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="rounded-full p-3 shadow-xl" style={{ backgroundColor: colorDef?.text ?? "#333" }}>
                      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Indicateur de sélection — fond blanc */}
          <div className="shrink-0 flex justify-center pb-1">
            {chosen === null ? (
              <div className="bg-white/80 rounded-full px-4 py-1.5 shadow-sm">
                <p className="text-xs font-medium text-primary/50">
                  {t("quizResults.tapPreferredFormula")}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-full px-4 py-1.5 shadow-sm flex items-center gap-2 text-sm font-semibold text-primary">
                <MaterialIcon name="check_circle" className="text-[18px]" />
                {t("quizResults.selectedNext")}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── Récapitulatif final ────────────────────────────────────────────
  return (
    <div className="h-dvh w-full flex flex-col bg-background-light overflow-hidden">
      <Navbar showActions={false} transparent />

      <main className="flex-1 flex flex-col min-h-0 px-4 pb-4 pt-2 max-w-6xl mx-auto w-full gap-3">

        {/* Header compact */}
        <div className="shrink-0 text-center">
          <h1 className="text-primary tracking-tight text-xl font-bold font-display">
            {t("quizResults.yourFormulas")}
          </h1>
          <p className="text-primary/50 text-xs">
            {t("quizResults.tapChangeToModify")}
          </p>
        </div>

        {/* Toutes les formules côte à côte */}
        <div className="flex-1 flex flex-row gap-3 min-h-0">
          {participants.map((participant) => {
            const colorDef = PARTICIPANT_COLORS.find((c) => c.id === participant.color);
            const chosenIdx = selections[participant.color];
            const formula = participant.formulas[chosenIdx];
            const ref = references[participant.color];
            const selectedSize = selectedSizes[participant.color]?.[chosenIdx] ?? "30ml";

            return (
              <div key={participant.color} className="flex-1 min-w-0 flex flex-col gap-2">
                {/* Badge couleur */}
                <div
                  className="shrink-0 flex items-center justify-between px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: colorDef?.bg ?? "#f0f0f0", color: colorDef?.text ?? "#333" }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: colorDef?.text ?? "#333" }} />
                    <span className="font-bold text-xs">{colorDef ? t(colorDef.labelKey) : participant.color}</span>
                  </div>
                  {ref
                    ? <span className="text-[10px] font-mono opacity-60">{ref}</span>
                    : (
                      <button
                        onClick={() => handleChange(participant.color)}
                        className="text-[10px] font-semibold underline opacity-60 hover:opacity-100"
                      >
                        {t("quizResults.change")}
                      </button>
                    )
                  }
                </div>
                {/* Carte formule */}
                <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-primary/10">
                  {renderFormula(formula, {
                    variant: "comparison",
                    className: "h-full",
                    selectedSize,
                    onSelectedSizeChange: (size) => handleFormulaSizeChange(participant.color, chosenIdx, size),
                  })}
                </div>
                {!isCatalogFormula(formula) && (
                  <div className="flex flex-row gap-2 items-center justify-center">
                    <button
                      onClick={() => handlePrintOne(participant.color)}
                      title={t("quiz.print")}
                      className="flex items-center justify-center size-8 rounded-full brand-surface border border-primary/25 text-primary shadow-sm hover:bg-primary/5 transition-all"
                    >
                      <MaterialIcon name="print" className="text-[16px]" />
                    </button>
                    <FormulaQrCode
                      formula={createShareableFormula(formula.profile, selectedSize, formula.sizes!)}
                      language={language as "fr" | "en"}
                      buttonLabel={t("recommendations.qrButton")}
                      title={`${t("recommendations.qrTitle")} · ${colorDef ? t(colorDef.labelKey) : participant.color}`}
                      subtitle={t("recommendations.qrSubtitle")}
                      closeLabel={t("recommendations.qrClose")}
                      iconOnly
                      className="flex items-center justify-center size-8 rounded-full bg-primary text-white shadow-sm hover:brightness-110 transition-all"
                    />
                    {ref && (
                      <SendFormulaMailButton
                        reference={ref}
                        iconOnly
                        className="flex items-center justify-center size-8 rounded-full brand-surface border border-primary/25 text-primary shadow-sm hover:bg-primary/5 transition-all"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Formules imprimables, cachées à l'écran — voir printTarget/@media print (globals.css) */}
        {participants.map((participant) => {
          const chosenIdx = selections[participant.color];
          const formula = participant.formulas[chosenIdx];
          if (chosenIdx === undefined || isCatalogFormula(formula)) return null;
          const activeSize = selectedSizes[participant.color]?.[chosenIdx] ?? "30ml";
          const size = formula.sizes![activeSize];
          return (
            <div
              key={participant.color}
              data-print-target={participant.color}
              className={printTarget === "all" || printTarget === participant.color ? "print-formula-active" : ""}
            >
              <PrintableFormula
                profile={formula.profile}
                date={new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                reference={references[participant.color]}
                notes={{ top: size.top_notes, heart: size.heart_notes, base: size.base_notes }}
              />
            </div>
          );
        })}

        {/* Actions */}
        <div className="shrink-0 flex flex-row gap-3 items-center justify-center py-1">
          {saveStatus !== "saved" ? (
            <button
              onClick={handleSaveAll}
              disabled={saveStatus === "saving"}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saveStatus === "saving"
                ? <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <MaterialIcon name="save" className="text-[18px]" />
              }
              {t("quizResults.validate")}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-green-700 font-semibold">
              <MaterialIcon name="check_circle" className="text-[18px]" />
              {t("quizResults.saved")}
            </div>
          )}
          {saveStatus === "error" && <p className="text-xs text-red-500">{t("quizResults.saveError")}</p>}

          {saveStatus === "saved" && (
            <button
              onClick={handlePrintAll}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white border border-primary/25 text-primary text-sm font-bold shadow-sm hover:bg-primary/5 transition-all"
            >
              <MaterialIcon name="print" className="text-[18px]" />
              {t("quizResults.printAllFormulas").replace("{count}", String(participants.length))}
            </button>
          )}

          <button
            onClick={() => { localStorage.removeItem("quiz_multi_results"); localStorage.removeItem("participant_colors"); router.push("/"); }}
            className="text-surface opacity-50 text-xs hover:text-primary hover:opacity-100 transition-colors cursor-pointer"
          >
            {t("recommendations.returnHome")}
          </button>
        </div>
      </main>
    </div>
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
