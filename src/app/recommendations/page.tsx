"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import AvatarSection from "@/components/interaction/AvatarSection";
import AvatarVideo from "@/components/interaction/AvatarVideo";

import FormulaCard from "@/components/recommendations/FormulaCard";
import CatalogFormulaCard from "@/components/recommendations/CatalogFormulaCard";
import MoodboardButton, { MOODBOARD_ENABLED } from "@/components/recommendations/MoodboardButton";
import FormulaQrCode from "@/components/recommendations/FormulaQrCode";
import PrintableFormula from "@/components/recommendations/PrintableFormula";
import SendFormulaMailButton from "@/components/recommendations/SendFormulaMailButton";
import FormulaPyramidPanel, { PyramidFormula } from "@/components/recommendations/FormulaPyramidPanel";
import nextDynamic from "next/dynamic";
const BottomBar = nextDynamic(() => import("@/components/livekit/BottomBar"), { ssr: false });
import { useTranslation } from "@/i18n/LanguageContext";
import { useSession, DEV_MODE, isCatalogFormula, Formula } from "@/context/SessionContext";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { resolveStoredLanguage } from "@/lib/language";
import { createShareableFormula } from "@/lib/shareableFormula";
import { SizeOption } from "@/components/recommendations/SizeToggle";
import { activeBrand } from "@/lib/brand";

const isEster = activeBrand.id === "ester";

function renderFormula(
  formula: Formula,
  opts: {
    variant: "default" | "comparison";
    className?: string;
    selectedSize: SizeOption;
    onSelectedSizeChange: (size: SizeOption) => void;
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
      name={formula.profile ?? ""}
      sizes={formula.sizes!}
      variant={opts.variant}
      className={opts.className}
      selectedSize={opts.selectedSize}
      onSelectedSizeChange={opts.onSelectedSizeChange}
    />
  );
}

export default function RecommendationsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { formulas: sessionFormulas, formulaReference, endSession, agentName, sessionData, replaceSelectedFormula, profile } = useSession();
  const [selectedSize, setSelectedSize] = useState<SizeOption>("30ml");

  const [devSingleFormula, setDevSingleFormula] = useState(false);

  const persona = typeof window !== "undefined" ? localStorage.getItem("persona") : null;
  const avatarUrl = persona === "male" ? "/avatar-h.jpg" : "/avatar-f.jpg";
  const avatarEnabled = typeof window !== "undefined" ? localStorage.getItem("avatar") !== "false" : true;

  const isCatalog = sessionFormulas.length > 0 && isCatalogFormula(sessionFormulas[0]);
  const allFormulas = sessionFormulas.map((f, i) => ({ key: `formula-${i}`, formula: f }));

  const formulas = DEV_MODE && devSingleFormula ? allFormulas.slice(0, 1) : allFormulas;
  const isSingle = formulas.length === 1;
  const showResumeButton = DEV_MODE && devSingleFormula;
  const selectedFormula = sessionFormulas[0];
  const language = resolveStoredLanguage();

  return (
    // Vue 2 formules : tout tient dans l'écran (cartes réduites et scrollables) pour garder la barre d'outils visible
    <div className={`relative flex w-full flex-col overflow-x-hidden ${isSingle ? "min-h-dvh overflow-y-auto" : "h-dvh overflow-hidden"}`}>
      <Navbar showActions={false} transparent />

      <main className={`flex-1 flex flex-col px-3 sm:px-5 pt-2 sm:pt-3 max-w-[1400px] mx-auto w-full relative z-10 ${isSingle ? "pb-6" : "min-h-0 pb-1"}`}>

        {/* ── Avatar ── visible uniquement en vue 2 formules ── */}
        {!isSingle && (
          <div className="shrink-0 flex flex-col items-center gap-1 mt-1 sm:mt-3 mb-2 sm:mb-3 [@media(max-height:580px)]:hidden">
            <AvatarSection name="" role="" imageUrl={avatarUrl} avatarEnabled={avatarEnabled} />
          </div>
        )}

        {/* ── Toggle dev mode ── */}
        {DEV_MODE && (
          <div className="shrink-0 flex items-center justify-center gap-1 mb-2">
            <button
              onClick={() => setDevSingleFormula(false)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                !devSingleFormula
                  ? "bg-primary text-white border-primary"
                  : "bg-transparent text-primary/50 border-primary/20 hover:border-primary/40"
              }`}
            >
              2 formules
            </button>
            <button
              onClick={() => setDevSingleFormula(true)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                devSingleFormula
                  ? "bg-primary text-white border-primary"
                  : "bg-transparent text-primary/50 border-primary/20 hover:border-primary/40"
              }`}
            >
              1 formule choisie
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            VUE 1 FORMULE
            [FormulaCard ~50%] | [Carte avatar ~50%]
                                  - avatar
                                  - J'ai une question
                                  - QR code
                                  - retour accueil
        ════════════════════════════════════════════════ */}
        {isSingle ? (
          <div className="flex-1 flex flex-col items-center gap-3 w-full pt-10">

            {/* En-tête, sur la ligne du logo (navbar fixe) : référence au centre, agent à droite —
                libère l'axe vertical pour que la barre d'outils reste visible. */}
            {formulaReference && !isCatalog && (
              <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center leading-tight">
                  <span className="font-mono font-bold text-primary text-xl sm:text-2xl tracking-wide">{formulaReference}</span>
                  <span className="text-[10px] text-primary/70">{t("quizResults.giveReferenceToPerfumer")}</span>
                </div>
              </div>
            )}
            <div className="fixed top-2 right-4 sm:right-6 z-40 flex items-center gap-2">
              <p className="hidden sm:block text-xs font-light tracking-wide italic text-primary">{agentName} AI</p>
              <div className="relative shrink-0">
                <div className="size-12 sm:size-14 rounded-full overflow-hidden border-2 border-white ai-glow">
                  <AvatarVideo fallbackUrl={avatarUrl} avatarEnabled={avatarEnabled} />
                </div>
                <div className="absolute bottom-0 right-0 size-3 bg-primary rounded-full border-2 border-white" />
              </div>
            </div>

            {/* Pyramide olfactive (marques à formules générées) ou carte catalogue (Ester) */}
            {selectedFormula && !isCatalogFormula(selectedFormula) ? (
              <FormulaPyramidPanel
                formula={selectedFormula as PyramidFormula}
                selectedSize={selectedSize}
                onSelectedSizeChange={setSelectedSize}
                language={language}
                onFormulaChange={(updated) => replaceSelectedFormula(updated as Formula)}
                reference={formulaReference ?? undefined}
                sessionId={sessionData?.session_id}
              />
            ) : (
              formulas[0] && (
                <div className="w-full max-w-[460px] h-[470px]">
                  {renderFormula(formulas[0].formula, {
                    variant: "default",
                    className: "h-full",
                    selectedSize,
                    onSelectedSizeChange: setSelectedSize,
                  })}
                </div>
              )
            )}

            {/* Bouton J'ai une question */}
            {showResumeButton && (
              <button className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm text-primary text-xs sm:text-sm font-medium border border-primary/25 cursor-pointer shadow-lg shadow-primary/10 hover:bg-white hover:border-primary/40 transition-all">
                <MaterialIcon name="mic" className="text-[18px]" />
                {t("recommendationsPage.resumeQuestion")}
              </button>
            )}

            {/* Imprimer / QR code / Recevoir par mail (indisponibles en mode catalogue) */}
            {!isCatalog && (
              <div className="flex flex-row flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => window.print()}
                  title={t("recommendationsPage.print")}
                  className="flex items-center justify-center size-9 rounded-full bg-white/90 backdrop-blur-sm text-primary border border-primary/25 cursor-pointer shadow-lg shadow-primary/10 hover:bg-white hover:border-primary/40 transition-all"
                >
                  <MaterialIcon name="print" className="text-[18px]" />
                </button>

                {selectedFormula && !isCatalogFormula(selectedFormula) && (
                  <FormulaQrCode
                    formula={createShareableFormula(selectedFormula.profile!, selectedSize, selectedFormula.sizes!)}
                    language={language}
                    buttonLabel={t("recommendations.qrButton")}
                    title={t("recommendations.qrTitle")}
                    subtitle={t("recommendations.qrSubtitle")}
                    closeLabel={t("recommendations.qrClose")}
                    iconOnly
                    className="flex items-center justify-center size-9 rounded-full bg-primary text-white shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
                  />
                )}

                {MOODBOARD_ENABLED && selectedFormula && !isCatalogFormula(selectedFormula) && (
                  <MoodboardButton
                    reference={formulaReference}
                    initialImageUrl={selectedFormula.moodboard_image_url}
                    iconOnly
                    className="flex items-center justify-center size-9 rounded-full bg-white/90 backdrop-blur-sm text-primary border border-primary/25 cursor-pointer shadow-lg shadow-primary/10 hover:bg-white hover:border-primary/40 transition-all"
                  />
                )}

                {/* Recevoir par mail : toujours visible et libellé ; la référence arrive avec
                    l'événement formula_selected de l'agent, désactivé en attendant. */}
                {formulaReference ? (
                  <SendFormulaMailButton
                    reference={formulaReference}
                    initialFirstName={profile.first_name}
                    iconOnly
                    className="flex items-center justify-center size-9 rounded-full bg-white/90 backdrop-blur-sm text-primary border border-primary/25 cursor-pointer shadow-lg shadow-primary/10 hover:bg-white hover:border-primary/40 transition-all"
                  />
                ) : (
                  <button
                    disabled
                    title={t("sendMail.button")}
                    className="flex items-center justify-center size-9 rounded-full bg-white/90 text-primary border border-primary/25 opacity-50 cursor-wait"
                  >
                    <span className="size-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  </button>
                )}

                {/* Terminer : fin de session et retour à l'accueil */}
                <button
                  onClick={() => { endSession(); router.push("/"); }}
                  className="ml-1 flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:brightness-110 transition-all"
                >
                  {t("quizResults.finish")}
                  <MaterialIcon name="arrow_forward" className="text-[18px]" />
                </button>
              </div>
            )}

            {/* Mode catalogue (pas de barre d'actions) : sortie classique */}
            {isCatalog && (
              <button
                onClick={() => { endSession(); router.push("/"); }}
                className="text-gray-400 brand-text text-xs hover:text-primary transition-colors cursor-pointer py-1"
              >
                {t("recommendations.returnHome")}
              </button>
            )}
          </div>

        ) : (

        /* ════════════════════════════════════════════════
            VUE 2 FORMULES
            [carte 1] [carte 2]
        ════════════════════════════════════════════════ */
          <div className="flex-1 min-h-0 flex flex-col gap-2 sm:gap-3">

            {/* Zone des cartes : prend la hauteur restante, scroll si l'écran est trop petit */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">

              {/* Mobile : cartes empilées (scroll) ; sm+ : côte à côte, hauteur = espace disponible */}
              <div className="w-full sm:h-full flex flex-col sm:flex-row items-center sm:items-stretch justify-center gap-2 sm:gap-6">
                {formulas.length > 0 ? (
                  formulas.map((item) => (
                    <div
                      key={item.key}
                      className="w-full max-w-[340px] shrink-0 h-[min(55dvh,520px)] sm:shrink sm:flex-1 sm:h-auto sm:max-h-[720px] sm:min-h-[260px]"
                    >
                      {renderFormula(item.formula, {
                        variant: "comparison",
                        className: "h-full",
                        selectedSize,
                        onSelectedSizeChange: setSelectedSize,
                      })}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center text-lg font-light self-center flex-1">
                    {t(isEster ? "recommendations.noFormulasCatalog" : "recommendations.noFormulas")}
                  </p>
                )}
              </div>
            </div>

            {/* Retour accueil */}
            <div className="shrink-0 flex justify-center">
              <button
                onClick={() => { endSession(); router.push("/"); }}
                className="text-gray-400 brand-text text-xs hover:text-primary transition-colors cursor-pointer py-1"
              >
                {t("recommendations.returnHome")}
              </button>
            </div>
          </div>
        )}

        <div className={`flex justify-center shrink-0 ${isSingle ? "py-3" : "py-2"}`}>
          {sessionData && <BottomBar />}
        </div>
      </main>

      {/* Décorations fond */}
      <div className="absolute top-0 right-0 -z-10 w-[40%] h-full opacity-[0.03] pointer-events-none bg-gradient-to-l from-primary to-transparent" />
      <div className="absolute bottom-0 left-0 -z-10 w-[40%] h-[60%] opacity-[0.05] pointer-events-none bg-gradient-to-tr from-primary to-transparent blur-[120px]" />

      {selectedFormula && !isCatalogFormula(selectedFormula) && (
        <PrintableFormula
          profile={selectedFormula.profile!}
          date={new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          notes={{
            top: selectedFormula.sizes![selectedSize].top_notes,
            heart: selectedFormula.sizes![selectedSize].heart_notes,
            base: selectedFormula.sizes![selectedSize].base_notes,
          }}
        />
      )}
    </div>
  );
}
