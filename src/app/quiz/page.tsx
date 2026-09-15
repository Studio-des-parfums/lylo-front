"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import ChoiceCard from "@/components/interaction/ChoiceCard";
import AnswerConfirmation from "@/components/interaction/AnswerConfirmation";
import StepProgress from "@/components/interaction/StepProgress";
import GeneratingLoader from "@/components/livekit/GeneratingLoader";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { useTranslation } from "@/i18n/LanguageContext";
import { PARTICIPANT_COLORS } from "@/components/configure/ConfigPanel";
import { persistLanguage, resolveStoredLanguage } from "@/lib/language";
import { activeBrand } from "@/lib/brand";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const isEster = activeBrand.id === "ester";

interface QuestionChoice { label: string; image?: string; }
interface Question { id: number; question: string; choices: QuestionChoice[]; }
interface QuizAnswer { question_id: number; question_text: string; top_2: string[]; bottom_2: string[]; }
interface Profile { gender: "homme" | "femme" | ""; age: string; pregnant: boolean | null; has_allergies: boolean | null; allergies: string; }

type Step = "profile" | "questionnaire";
type Phase = "top2" | "bottom2" | "confirm" | "intensity";
type ProfileStep = "gender" | "age" | "pregnant" | "allergies" | "allergies_detail";
type FormulaType = "frais" | "mix" | "puissant";

// ── Mode multi ───────────────────────────────────────────────────────────
interface ParticipantState {
  color: string;
  profile: Profile;
  answers: QuizAnswer[];
  formulaType: FormulaType | null;
}

function BigButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-4 rounded-xl border-2 text-base font-semibold transition-all
        ${selected
          ? "border-primary bg-primary text-white shadow-lg scale-[1.02]"
          : "border-primary/20 bg-white text-primary/80 hover:bg-primary hover:text-white hover:border-primary shadow-sm"
        }`}
    >
      {label}
    </button>
  );
}

// ── Choix d'intensité (frais / mix / puissant) ──────────────────────────
function IntensityCard({ icon, label, description, selected, onClick }: { icon: string; label: string; description: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-2 py-6 px-4 rounded-xl border-2 transition-all
        ${selected
          ? "border-primary bg-primary text-white shadow-lg scale-[1.02]"
          : "border-primary/20 bg-white text-primary hover:border-primary hover:shadow-md"
        }`}
    >
      <MaterialIcon name={icon} className={`text-[28px] ${selected ? "text-white" : "text-primary"}`} />
      <span className="text-base font-semibold">{label}</span>
      <span className={`text-xs ${selected ? "text-white/80" : "text-primary/50"}`}>{description}</span>
    </button>
  );
}

// ── Bannière couleur ─────────────────────────────────────────────────────
function ColorTurnBanner({ colorId }: { colorId: string }) {
  const { t } = useTranslation();
  const def = PARTICIPANT_COLORS.find((c) => c.id === colorId);
  if (!def) return null;
  const colorLabel = t(def.labelKey);
  return (
    <div
      className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-sm font-bold tracking-wide"
      style={{ backgroundColor: def.bg, color: def.text }}
    >
      <span
        className="inline-block size-3 rounded-full"
        style={{ backgroundColor: def.text }}
      />
      {t("quiz.yourTurn").replace("{name}", colorLabel.charAt(0).toUpperCase() + colorLabel.slice(1))}
    </div>
  );
}

export default function QuizPage() {
  const router = useRouter();
  const { t } = useTranslation();

  // ── Config depuis localStorage ─────────────────────────────────────
  const language = resolveStoredLanguage();
  if (typeof window !== "undefined") {
    persistLanguage(language);
  }
  const depth = typeof window !== "undefined" ? localStorage.getItem("depth") ?? "12" : "12";
  const questionCount = parseInt(depth) || 12;

  const rawColors = typeof window !== "undefined" ? localStorage.getItem("participant_colors") : null;
  const participantColors: string[] = rawColors ? JSON.parse(rawColors) : [];
  const isMulti = participantColors.length > 1;

  // ── État commun ────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("profile");
  const [profileStep, setProfileStep] = useState<ProfileStep>("gender");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("top2");
  const [top2, setTop2] = useState<string[]>([]);
  const [bottom2, setBottom2] = useState<string[]>([]);

  // ── Mode solo ──────────────────────────────────────────────────────
  const [profile, setProfile] = useState<Profile>({
    gender: "", age: "", pregnant: null, has_allergies: null, allergies: "",
  });
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [formulaType, setFormulaType] = useState<FormulaType | null>(null);

  // ── Mode multi ─────────────────────────────────────────────────────
  const initParticipants = (): ParticipantState[] =>
    participantColors.map((color) => ({
      color,
      profile: { gender: "", age: "", pregnant: null, has_allergies: null, allergies: "" },
      answers: [],
      formulaType: null,
    }));
  const [participants, setParticipants] = useState<ParticipantState[]>(initParticipants);
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState(0);
  // En mode multi, l'étape de profil s'applique participant par participant
  const [multiProfileStep, setMultiProfileStep] = useState<ProfileStep>("gender");

  const currentParticipant = participants[currentParticipantIndex];
  const currentColor = isMulti ? participantColors[currentParticipantIndex] : null;
  const colorDef = currentColor ? PARTICIPANT_COLORS.find((c) => c.id === currentColor) : null;

  // ── Chargement des questions ────────────────────────────────────────
  useEffect(() => {
    if (step !== "questionnaire") return;
    setLoading(true);
    fetch(`${API_BASE}/api/questions?count=${questionCount}&language=${language}`)
      .then((r) => { if (!r.ok) throw new Error(t("quiz.errorLoadingQuestions")); return r.json(); })
      .then((data) => setQuestions(Array.isArray(data) ? data : data.questions ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [step]);

  // ── Couleur de fond dynamique ────────────────────────────────────────
  const bgStyle = colorDef
    ? { backgroundColor: colorDef.bg }
    : {};

  // ════════════════════════════════════════════════════════════════════
  // PROFIL SOLO
  // ════════════════════════════════════════════════════════════════════
  const advanceProfile = useCallback((updates: Partial<Profile>) => {
    const next = { ...profile, ...updates };
    setProfile(next);
    if (profileStep === "gender") {
      setProfileStep("age");
    } else if (profileStep === "age") {
      setProfileStep(next.gender === "femme" ? "pregnant" : "allergies");
    } else if (profileStep === "pregnant") {
      setProfileStep("allergies");
    } else if (profileStep === "allergies") {
      if (updates.has_allergies === true) setProfileStep("allergies_detail");
      else setStep("questionnaire");
    } else if (profileStep === "allergies_detail") {
      setStep("questionnaire");
    }
  }, [profile, profileStep]);

  // ════════════════════════════════════════════════════════════════════
  // PROFIL MULTI
  // ════════════════════════════════════════════════════════════════════
  const updateCurrentParticipantProfile = (updates: Partial<Profile>) => {
    setParticipants((prev) => {
      const next = [...prev];
      next[currentParticipantIndex] = {
        ...next[currentParticipantIndex],
        profile: { ...next[currentParticipantIndex].profile, ...updates },
      };
      return next;
    });
  };

  const advanceMultiProfile = useCallback((updates: Partial<Profile>) => {
    const next = { ...currentParticipant.profile, ...updates };
    updateCurrentParticipantProfile(updates);

    if (multiProfileStep === "gender") {
      setMultiProfileStep("age");
    } else if (multiProfileStep === "age") {
      setMultiProfileStep(next.gender === "femme" ? "pregnant" : "allergies");
    } else if (multiProfileStep === "pregnant") {
      setMultiProfileStep("allergies");
    } else if (multiProfileStep === "allergies") {
      if (updates.has_allergies === true) {
        setMultiProfileStep("allergies_detail");
      } else {
        // Ce participant a fini son profil
        advanceToNextParticipantOrQuestionnaire();
      }
    } else if (multiProfileStep === "allergies_detail") {
      advanceToNextParticipantOrQuestionnaire();
    }
  }, [currentParticipant, multiProfileStep, currentParticipantIndex, participants]);

  const advanceToNextParticipantOrQuestionnaire = () => {
    if (currentParticipantIndex + 1 < participantColors.length) {
      setCurrentParticipantIndex((i) => i + 1);
      setMultiProfileStep("gender");
    } else {
      // Tous les profils remplis → questionnaire, on recommence depuis le premier participant
      setCurrentParticipantIndex(0);
      setStep("questionnaire");
    }
  };

  // ════════════════════════════════════════════════════════════════════
  // QUESTIONNAIRE (solo + multi)
  // ════════════════════════════════════════════════════════════════════
  const currentQuestion = questions[currentIndex];

  const handleTopSelect = useCallback((label: string) => {
    setTop2((prev) => {
      if (prev.includes(label)) return prev.filter((l) => l !== label);
      if (prev.length >= 2) return prev;
      return [...prev, label];
    });
  }, []);

  const handleBottomSelect = useCallback((label: string) => {
    setBottom2((prev) => {
      if (prev.includes(label)) return prev.filter((l) => l !== label);
      if (prev.length >= 2) return prev;
      return [...prev, label];
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (!currentQuestion) return;
    const allLabels = currentQuestion.choices.map((c) => c.label);
    const remaining = allLabels.filter((l) => !top2.includes(l) && !bottom2.includes(l));
    const answer: QuizAnswer = {
      question_id: currentQuestion.id,
      question_text: currentQuestion.question,
      top_2: top2,
      bottom_2: bottom2.length === 2 ? bottom2 : [...bottom2, ...remaining].slice(0, 2),
    };

    if (isMulti) {
      // Construit l'état mis à jour localement pour pouvoir l'utiliser immédiatement
      const updatedParticipants = participants.map((p, i) =>
        i === currentParticipantIndex
          ? { ...p, answers: [...p.answers, answer] }
          : p
      );
      setParticipants(updatedParticipants);

      const nextParticipantIdx = currentParticipantIndex + 1;
      if (nextParticipantIdx < participantColors.length) {
        // Passe au participant suivant pour la même question
        setCurrentParticipantIndex(nextParticipantIdx);
        setPhase("top2"); setTop2([]); setBottom2([]);
      } else {
        // Tous ont répondu à cette question → question suivante
        setCurrentParticipantIndex(0);
        if (currentIndex + 1 < questions.length) {
          setCurrentIndex((i) => i + 1);
          setPhase("top2"); setTop2([]); setBottom2([]);
        } else if (activeBrand.id === "ester") {
          // Catalogue Ester : pas de génération LLM, pas de choix d'intensité.
          submitMultiAnswers(updatedParticipants);
        } else {
          // Toutes les questions terminées — chaque participant choisit son intensité
          // avant soumission finale, à tour de rôle comme pour les questions.
          setParticipants(updatedParticipants);
          setCurrentParticipantIndex(0);
          setPhase("intensity");
        }
      }
    } else {
      const newAnswers = [...answers, answer];
      setAnswers(newAnswers);
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((i) => i + 1);
        setPhase("top2"); setTop2([]); setBottom2([]);
      } else if (activeBrand.id === "ester") {
        submitAnswers(newAnswers);
      } else {
        setPhase("intensity");
      }
    }
  }, [currentQuestion, top2, bottom2, answers, currentIndex, questions.length, isMulti, currentParticipantIndex, participantColors.length, participants]);

  // ── Choix d'intensité (solo + multi) ───────────────────────────────
  const handleIntensitySelect = useCallback((type: FormulaType) => {
    if (isMulti) {
      const updatedParticipants = participants.map((p, i) =>
        i === currentParticipantIndex ? { ...p, formulaType: type } : p
      );
      setParticipants(updatedParticipants);

      const nextParticipantIdx = currentParticipantIndex + 1;
      if (nextParticipantIdx < participantColors.length) {
        setCurrentParticipantIndex(nextParticipantIdx);
      } else {
        submitMultiAnswers(updatedParticipants);
      }
    } else {
      setFormulaType(type);
      submitAnswers(answers, type);
    }
  }, [isMulti, participants, currentParticipantIndex, participantColors.length, answers]);

  // ── Soumission solo ────────────────────────────────────────────────
  const submitAnswers = async (finalAnswers: QuizAnswer[], type?: FormulaType | null) => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/formulas/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          brand: activeBrand.id,
          gender: profile.gender,
          age: profile.age,
          has_allergies: profile.has_allergies ? "oui" : "non",
          allergies: profile.allergies || undefined,
          pregnant: profile.pregnant ?? false,
          answers: finalAnswers,
          formula_type: type ?? formulaType ?? undefined,
        }),
      });
      if (!res.ok) throw new Error(t("quiz.errorGenerating"));
      const data = await res.json();
      localStorage.setItem("quiz_formulas", JSON.stringify(data.formulas ?? []));
      router.push("/quiz/results");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("quiz.errorUnknown"));
      setGenerating(false);
    }
  };

  // ── Soumission multi ───────────────────────────────────────────────
  const submitMultiAnswers = async (finalParticipants: ParticipantState[]) => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/formulas/generate-multi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          brand: activeBrand.id,
          participants: finalParticipants.map((p) => ({
            color: p.color,
            gender: p.profile.gender,
            age: p.profile.age,
            has_allergies: p.profile.has_allergies ? "oui" : "non",
            allergies: p.profile.allergies || undefined,
            pregnant: p.profile.pregnant ?? false,
            answers: p.answers,
            formula_type: p.formulaType ?? undefined,
          })),
        }),
      });
      if (!res.ok) throw new Error(t("quiz.errorGeneratingMulti"));
      const data = await res.json();
      localStorage.setItem("quiz_multi_results", JSON.stringify(data.participants ?? []));
      router.push("/quiz/results");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("quiz.errorUnknown"));
      setGenerating(false);
    }
  };

  if (generating) return <GeneratingLoader />;
  if (error) return (
    <div className="relative h-dvh w-full flex flex-col bg-stone-50">
      <Navbar showActions={false} transparent />
      <main className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-red-500 text-sm text-center">{error}</p>
        <button onClick={() => router.push("/configure")} className="text-primary text-sm underline">{t("quiz.back")}</button>
      </main>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════
  // PROFIL — une question à la fois
  // ════════════════════════════════════════════════════════════════════
  if (step === "profile") {
    const activeProfile = isMulti ? currentParticipant.profile : profile;
    const activeProfileStep = isMulti ? multiProfileStep : profileStep;
    const activeAdvance = isMulti ? advanceMultiProfile : advanceProfile;

    const profileSteps: ProfileStep[] = ["gender", "age", "pregnant", "allergies", "allergies_detail"];
    const visibleSteps = profileSteps.filter((s) => {
      if (s === "pregnant" && activeProfile.gender !== "femme") return false;
      if (s === "allergies_detail" && !activeProfile.has_allergies) return false;
      return true;
    });
    const currentProfileIndex = visibleSteps.indexOf(activeProfileStep);
    const totalProfileSteps = visibleSteps.length;

    const goBackProfile = () => {
      if (isMulti) setMultiProfileStep(visibleSteps[currentProfileIndex - 1]);
      else setProfileStep(visibleSteps[currentProfileIndex - 1]);
    };

    return (
      <div className="relative flex h-dvh w-full flex-col transition-colors duration-500" style={bgStyle}>
        <Navbar showActions={false} transparent />

        <main className="flex-1 flex flex-col items-center justify-center px-4 relative z-10">
          <div className="w-full max-w-lg flex flex-col items-center gap-5">

            {isMulti && currentColor && (
              <ColorTurnBanner colorId={currentColor} />
            )}

            {/* Carte blanche : progress + question + contrôles */}
            <div className="w-full bg-white rounded-2xl shadow-lg px-8 py-8 flex flex-col items-center gap-6">

              {/* Progress */}
              <StepProgress currentStep={currentProfileIndex + 1} totalSteps={totalProfileSteps} />

              {/* Question genre */}
              {activeProfileStep === "gender" && (
                <div className="w-full flex flex-col items-center gap-6">
                  <h2 className="text-2xl md:text-3xl font-extralight tracking-tight text-center leading-tight text-primary">
                    {t("quiz.profileGenderQuestion")}
                  </h2>
                  <div className="flex gap-4 w-full max-w-xs">
                    <BigButton label={t("quiz.profileMale")} selected={activeProfile.gender === "homme"} onClick={() => activeAdvance({ gender: "homme", pregnant: false })} />
                    <BigButton label={t("quiz.profileFemale")} selected={activeProfile.gender === "femme"} onClick={() => activeAdvance({ gender: "femme" })} />
                  </div>
                </div>
              )}

              {/* Question âge */}
              {activeProfileStep === "age" && (
                <div className="w-full flex flex-col items-center gap-6">
                  <h2 className="text-2xl md:text-3xl font-extralight tracking-tight text-center leading-tight text-primary">
                    {t("quiz.profileAgeQuestion")}
                  </h2>
                  <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 border-primary/15 bg-stone-50 w-full max-w-xs">
                    <MaterialIcon name="cake" className="text-primary text-[20px] shrink-0" />
                    <input
                      type="number"
                      min={10} max={110}
                      value={activeProfile.age}
                      onChange={(e) => {
                        if (isMulti) updateCurrentParticipantProfile({ age: e.target.value });
                        else setProfile((p) => ({ ...p, age: e.target.value }));
                      }}
                      onKeyDown={(e) => e.key === "Enter" && activeProfile.age.trim() && activeAdvance({})}
                      placeholder={t("quiz.profileAgePlaceholder")}
                      autoFocus
                      className="flex-1 bg-transparent text-base font-medium text-primary placeholder:text-primary/35 outline-none"
                    />
                  </div>
                  <button
                    disabled={!activeProfile.age.trim()}
                    onClick={() => activeAdvance({})}
                    className="bg-primary hover:bg-primary/90 text-white font-bold px-10 py-3 rounded-lg shadow-xl transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                  >
                    {t("quiz.continue")} <MaterialIcon name="arrow_forward" />
                  </button>
                </div>
              )}

              {/* Question enceinte */}
              {activeProfileStep === "pregnant" && (
                <div className="w-full flex flex-col items-center gap-6">
                  <h2 className="text-2xl md:text-3xl font-extralight tracking-tight text-center leading-tight text-primary">
                    {t("quiz.profilePregnantQuestion")}
                  </h2>
                  <div className="flex gap-4 w-full max-w-xs">
                    <BigButton label={t("quiz.yes")} selected={activeProfile.pregnant === true} onClick={() => activeAdvance({ pregnant: true })} />
                    <BigButton label={t("quiz.no")} selected={activeProfile.pregnant === false} onClick={() => activeAdvance({ pregnant: false })} />
                  </div>
                </div>
              )}

              {/* Question allergies */}
              {activeProfileStep === "allergies" && (
                <div className="w-full flex flex-col items-center gap-6">
                  <h2 className="text-2xl md:text-3xl font-extralight tracking-tight text-center leading-tight text-primary">
                    {t("quiz.profileAllergiesQuestion")}
                  </h2>
                  <div className="flex gap-4 w-full max-w-xs">
                    <BigButton label={t("quiz.yes")} selected={activeProfile.has_allergies === true} onClick={() => activeAdvance({ has_allergies: true })} />
                    <BigButton label={t("quiz.no")} selected={activeProfile.has_allergies === false} onClick={() => activeAdvance({ has_allergies: false })} />
                  </div>
                </div>
              )}

              {/* Détail allergies */}
              {activeProfileStep === "allergies_detail" && (
                <div className="w-full flex flex-col items-center gap-6">
                  <h2 className="text-2xl md:text-3xl font-extralight tracking-tight text-center leading-tight text-primary">
                    {t("quiz.profileAllergiesDetailQuestion")}
                  </h2>
                  <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 border-primary/15 bg-stone-50 w-full max-w-xs">
                    <MaterialIcon name="warning" className="text-primary text-[20px] shrink-0" />
                    <input
                      type="text"
                      value={activeProfile.allergies}
                      onChange={(e) => {
                        if (isMulti) updateCurrentParticipantProfile({ allergies: e.target.value });
                        else setProfile((p) => ({ ...p, allergies: e.target.value }));
                      }}
                      onKeyDown={(e) => e.key === "Enter" && activeProfile.allergies.trim() && activeAdvance({})}
                      placeholder={t("quiz.profileAllergiesPlaceholder")}
                      autoFocus
                      className="flex-1 bg-transparent text-base font-medium text-primary placeholder:text-primary/35 outline-none"
                    />
                  </div>
                  <button
                    disabled={!activeProfile.allergies.trim()}
                    onClick={() => activeAdvance({})}
                    className="bg-primary hover:bg-primary/90 text-white font-bold px-10 py-3 rounded-lg shadow-xl transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                  >
                    {t("quiz.continue")} <MaterialIcon name="arrow_forward" />
                  </button>
                </div>
              )}

              {/* Retour */}
              {currentProfileIndex > 0 && (
                <button
                  onClick={goBackProfile}
                  className="text-primary/100 text-xs hover:text-primary transition-colors flex items-center gap-1"
                >
                  <MaterialIcon name="arrow_back" className="text-[14px]" />
                  {t("quiz.back")}
                </button>
              )}
            </div>
          </div>
        </main>

        <div className="absolute top-0 right-0 -z-10 w-[40%] h-full opacity-[0.03] pointer-events-none bg-gradient-to-l from-primary to-transparent" />
        <div className="absolute bottom-0 left-0 -z-10 w-[40%] h-[60%] opacity-[0.05] pointer-events-none bg-gradient-to-tr from-primary to-transparent blur-[120px]" />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // QUESTIONNAIRE
  // ════════════════════════════════════════════════════════════════════
  if (loading) return (
    <div className="relative h-dvh w-full flex flex-col bg-stone-50">
      <Navbar showActions={false} transparent />
      <main className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="size-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-primary/60 text-sm font-medium">{t("quiz.loading")}</p>
      </main>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════
  // CHOIX D'INTENSITÉ (léger / équilibré / intense) — avant génération
  // ════════════════════════════════════════════════════════════════════
  if (phase === "intensity") {
    return (
      <div className="relative flex h-dvh w-full flex-col transition-colors duration-500" style={isMulti && colorDef ? { backgroundColor: colorDef.bg } : {}}>
        <Navbar showActions={false} transparent />
        <main className="flex-1 flex flex-col items-center justify-center px-4 relative z-10">
          <div className="w-full max-w-lg flex flex-col items-center gap-5">
            {isMulti && currentColor && <ColorTurnBanner colorId={currentColor} />}
            <div className="w-full bg-white rounded-2xl shadow-lg px-8 py-8 flex flex-col items-center gap-6">
              <h2 className="text-2xl md:text-3xl font-extralight tracking-tight text-center leading-tight text-primary">
                {t("quiz.intensityQuestion")}
              </h2>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <IntensityCard
                  icon="air"
                  label={t("quiz.intensityFrais")}
                  description={t("quiz.intensityFraisDesc")}
                  selected={(isMulti ? currentParticipant.formulaType : formulaType) === "frais"}
                  onClick={() => handleIntensitySelect("frais")}
                />
                <IntensityCard
                  icon="balance"
                  label={t("quiz.intensityMix")}
                  description={t("quiz.intensityMixDesc")}
                  selected={(isMulti ? currentParticipant.formulaType : formulaType) === "mix"}
                  onClick={() => handleIntensitySelect("mix")}
                />
                <IntensityCard
                  icon="local_fire_department"
                  label={t("quiz.intensityPuissant")}
                  description={t("quiz.intensityPuissantDesc")}
                  selected={(isMulti ? currentParticipant.formulaType : formulaType) === "puissant"}
                  onClick={() => handleIntensitySelect("puissant")}
                />
              </div>
            </div>
          </div>
        </main>
        <div className="absolute top-0 right-0 -z-10 w-[40%] h-full opacity-[0.03] pointer-events-none bg-gradient-to-l from-primary to-transparent" />
        <div className="absolute bottom-0 left-0 -z-10 w-[40%] h-[60%] opacity-[0.05] pointer-events-none bg-gradient-to-tr from-primary to-transparent blur-[120px]" />
      </div>
    );
  }

  const visibleChoices = phase === "bottom2"
    ? currentQuestion?.choices.filter((c) => !top2.includes(c.label)) ?? []
    : currentQuestion?.choices ?? [];
  const selected = phase === "top2" ? top2 : phase === "bottom2" ? bottom2 : [];
  const phaseHint = phase === "top2" ? t("quiz.hintTop2") : phase === "bottom2" ? t("quiz.hintBottom2") : "";

  // En mode multi, le fond change selon le participant courant
  const questionBgStyle = isMulti && colorDef ? { backgroundColor: colorDef.bg } : {};

  return (
    <div className="relative flex h-dvh w-full flex-col transition-colors duration-500" style={questionBgStyle}>
      <Navbar showActions={false} transparent />
      <main className="flex-1 flex flex-col items-center justify-center gap-3 px-4 pb-4 pt-1 max-w-6xl mx-auto w-full min-h-0 relative z-10">

        {/* Bannière couleur en mode multi */}
        {isMulti && currentColor && (
          <div className="w-full max-w-2xl shrink-0">
            <ColorTurnBanner colorId={currentColor} />
          </div>
        )}

        {/* Question + hint dans une carte blanche */}
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-md px-6 py-4 flex flex-col items-center gap-2 shrink-0">
          <StepProgress currentStep={currentIndex + 1} totalSteps={questions.length} />
          <h3 className="text-2xl md:text-3xl font-extralight tracking-tight text-center leading-tight text-primary">
            {currentQuestion?.question}
          </h3>
          {phaseHint && <p className={`text-xs tracking-widest uppercase ${isEster ? "text-primary font-semibold" : "text-primary/100"}`}>{phaseHint}</p>}
        </div>

        {phase === "confirm" ? (
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-md px-4 py-4">
            <AnswerConfirmation
              top2={top2.map((label) => { const img = currentQuestion?.choices.find((c) => c.label === label)?.image; return { label, image: img ? (img.startsWith("http") ? img : `${API_BASE}${img}`) : undefined }; })}
              bottom2={bottom2.map((label) => { const img = currentQuestion?.choices.find((c) => c.label === label)?.image; return { label, image: img ? (img.startsWith("http") ? img : `${API_BASE}${img}`) : undefined }; })}
            />
          </div>
        ) : (
          <div className="relative w-full max-w-5xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 w-full" style={{ height: "36vh" }}>
              {visibleChoices.map((choice) => (
                <ChoiceCard key={choice.label} name={choice.label}
                  imageUrl={choice.image ? (choice.image.startsWith("http") ? choice.image : `${API_BASE}${choice.image}`) : undefined}
                  selected={selected.includes(choice.label)} clickable
                  onSelect={phase === "top2" ? handleTopSelect : handleBottomSelect}
                />
              ))}
            </div>
          </div>
        )}

        <div className="shrink-0 py-2 flex justify-center">
          {phase === "top2" && (
            <button disabled={top2.length < 2} onClick={() => setPhase("bottom2")}
              className="bg-white hover:bg-primary text-primary hover:text-white border border-primary/20 font-bold px-10 py-3 rounded-xl shadow-md transition-all hover:scale-[1.02] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-white disabled:hover:text-primary">
              {t("quiz.continue")}
            </button>
          )}
          {phase === "bottom2" && (
            <button disabled={bottom2.length < 2} onClick={() => setPhase("confirm")}
              className="bg-white hover:bg-primary text-primary hover:text-white border border-primary/20 font-bold px-10 py-3 rounded-xl shadow-md transition-all hover:scale-[1.02] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-white disabled:hover:text-primary">
              {t("quiz.continue")}
            </button>
          )}
          {phase === "confirm" && (() => {
            const isLastParticipant = !isMulti || currentParticipantIndex === participantColors.length - 1;
            const isLastQuestion = currentIndex + 1 >= questions.length;
            const isVeryLast = isLastParticipant && isLastQuestion;
            return (
              <button onClick={handleConfirm}
                className="bg-primary hover:bg-primary/90 text-white font-bold px-10 py-3 rounded-xl shadow-md transition-all hover:scale-[1.02]">
                {isVeryLast ? t(activeBrand.id === "ester" ? "quiz.submitCatalog" : "quiz.submit") : t("quiz.next")}
              </button>
            );
          })()}
        </div>
      </main>
      <div className="absolute top-0 right-0 -z-10 w-[40%] h-full opacity-[0.03] pointer-events-none bg-gradient-to-l from-primary to-transparent" />
      <div className="absolute bottom-0 left-0 -z-10 w-[40%] h-[60%] opacity-[0.05] pointer-events-none bg-gradient-to-tr from-primary to-transparent blur-[120px]" />
    </div>
  );
}
