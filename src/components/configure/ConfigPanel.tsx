"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MaterialIcon from "@/components/ui/MaterialIcon";
import PersonaSelector from "./PersonaSelector";
import DepthSelector from "./DepthSelector";
import LanguagePicker from "./LanguagePicker";
import ModeSelector from "./ModeSelector";
import InputModeSelector from "./InputModeSelector";
import ConnectionTest from "@/components/preparation/ConnectionTest";
import { useTranslation } from "@/i18n/LanguageContext";
import { activeBrand } from "@/lib/brand";

export const PARTICIPANT_COLORS = [
  { id: "rouge",   labelKey: "configure.colorRouge",     bg: "#FFADAD", text: "#7A1A1A" },
  { id: "vert",    labelKey: "configure.colorVert",       bg: "#B5EAD7", text: "#1A5C3A" },
  { id: "bleu",    labelKey: "configure.colorBleu",       bg: "#AEC6F8", text: "#1A2E5C" },
  { id: "jaune",   labelKey: "configure.colorJaune",      bg: "#FFEAA7", text: "#5C4A00" },
  { id: "violet",  labelKey: "configure.colorViolet",     bg: "#D4BFFF", text: "#3A1A6B" },
  { id: "orange",  labelKey: "configure.colorOrange",     bg: "#FFD6A5", text: "#6B3000" },
  { id: "rose",    labelKey: "configure.colorRose",       bg: "#FFCCE0", text: "#6B0038" },
  { id: "turquoise", labelKey: "configure.colorTurquoise", bg: "#B5F0F0", text: "#0A4A4A" },
] as const;

export default function ConfigPanel() {
  const router = useRouter();
  const [persona, setPersona] = useState("");
  const [depth, setDepth] = useState("");
  const [mode, setMode] = useState("");
  const [inputMode, setInputMode] = useState<"voice" | "click" | "quiz">("voice");
  const [avatar, setAvatar] = useState(true);
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Multi-utilisateurs (mode visuel uniquement) ──────────────────────
  const [participantCount, setParticipantCount] = useState(1);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Réinitialise les couleurs si le nombre de participants change
  useEffect(() => {
    setSelectedColors(Array(participantCount).fill(""));
  }, [participantCount]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  const handleColorSelect = (participantIndex: number, colorId: string) => {
    setSelectedColors((prev) => {
      const next = [...prev];
      next[participantIndex] = colorId;
      return next;
    });
  };

  const isQuiz = inputMode === "quiz";
  const isEster = activeBrand.id === "ester";

  const colorsValid =
    !isQuiz ||
    participantCount === 1 ||
    (selectedColors.slice(0, participantCount).every((c) => c !== "") &&
      new Set(selectedColors.slice(0, participantCount)).size === participantCount);

  const isFormComplete =
    colorsValid &&
    (isQuiz ? depth !== "" : persona !== "" && depth !== "" && mode !== "");

  const handleContinue = () => {
    localStorage.setItem("persona", persona);
    localStorage.setItem("depth", depth);
    localStorage.setItem("mode", mode);
    localStorage.setItem("input_mode", inputMode);
    localStorage.setItem("avatar", String(avatar));
    if (email.trim()) localStorage.setItem("recap_email", email.trim());
    else localStorage.removeItem("recap_email");

    if (isQuiz) {
      localStorage.setItem("participant_count", String(participantCount));
      if (participantCount > 1) {
        localStorage.setItem(
          "participant_colors",
          JSON.stringify(selectedColors.slice(0, participantCount))
        );
      } else {
        localStorage.removeItem("participant_colors");
      }
    }

    router.push(inputMode === "quiz" ? "/quiz" : "/preparation");
  };

  // ── Couleurs déjà choisies par un autre participant ──────────────────
  const usedColors = (idx: number) =>
    selectedColors.filter((_, i) => i !== idx);

  return (
    <div className="glass-panel custom-scrollbar w-full max-w-2xl rounded-xl shadow-xl relative z-10 border border-primary/5 p-4 sm:p-6 space-y-4 sm:space-y-5 [@media(max-height:620px)]:p-3 [@media(max-height:620px)]:space-y-2.5 [@media(max-height:620px)]:max-h-[calc(100dvh-6rem)] [@media(max-height:620px)]:overflow-y-auto">

      {/* ── Header ── */}
      <div className="text-center [@media(max-height:620px)]:hidden">
        <div className="inline-flex items-center gap-2 mb-1.5">
          <span className="h-px w-6 bg-primary/40" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">
            {t("configure.label")}
          </span>
          <span className="h-px w-6 bg-primary/40" />
        </div>
        <h1 className="text-primary tracking-tight text-xl sm:text-2xl font-bold mb-1 font-display">
          {t("configure.title")}
        </h1>
        <p className="text-primary/60 text-[11px] sm:text-xs font-medium">
          {t("configure.subtitle")}
        </p>
      </div>

      {/* ── Mode de réponse — toujours en premier ── */}
      <InputModeSelector value={inputMode} onChange={setInputMode} />

      {/* ── Two columns — masqué en mode visuel ── */}
      {!isQuiz && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5 [@media(max-height:620px)]:gap-2">

          {/* Left */}
          <div className="space-y-3 sm:space-y-4 [@media(max-height:620px)]:space-y-1.5">
            <LanguagePicker />
            <PersonaSelector value={persona} onChange={setPersona} />
            <DepthSelector value={depth} onChange={setDepth} />
            <ModeSelector value={mode} onChange={setMode} />
          </div>

          {/* Right */}
          <div className="space-y-3 sm:space-y-4 [@media(max-height:620px)]:space-y-1.5">

            {/* Avatar toggle */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary/60 font-bold">
                {t("configure.avatarTitle")}
              </p>
              <button
                type="button"
                onClick={() => setAvatar((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-primary/15 brand-surface-softer hover:bg-primary/5 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <MaterialIcon name={avatar ? "videocam" : "videocam_off"} className="text-primary text-[18px]" />
                  <span className="text-xs font-semibold text-primary">
                    {avatar ? t("configure.avatarOn") : t("configure.avatarOff")}
                  </span>
                </div>
                <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${avatar ? "bg-primary" : "bg-primary/20"}`}>
                  <div className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform duration-200 ${avatar ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
              </button>
              <p className="text-[10px] text-primary/50 leading-relaxed px-1">
                {t("configure.avatarHint")}
              </p>
            </div>

            {/* Fullscreen toggle */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary/60 font-bold">
                {t("configure.displayTitle")}
              </p>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-primary/15 brand-surface-softer hover:bg-primary/5 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <MaterialIcon name={isFullscreen ? "fullscreen_exit" : "fullscreen"} className="text-primary text-[18px]" />
                  <span className="text-xs font-semibold text-primary">
                    {isFullscreen ? t("configure.fullscreenExit") : t("configure.fullscreenEnter")}
                  </span>
                </div>
                <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${isFullscreen ? "bg-primary" : "bg-primary/20"}`}>
                  <div className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform duration-200 ${isFullscreen ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
              </button>
            </div>

            {/* Email recap */}
            {!isEster && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary/60 font-bold">
                  {t("configure.emailTitle")}
                </p>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/15 brand-surface-softer">
                  <MaterialIcon name="mail" className="text-primary text-[18px] shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("configure.emailPlaceholder")}
                    className="flex-1 bg-transparent text-xs font-medium text-primary placeholder:text-primary/35 outline-none"
                  />
                </div>
                <p className="text-[10px] text-primary/50 leading-relaxed px-1">
                  {t("configure.emailHint")}
                </p>
              </div>
            )}

            <ConnectionTest />
          </div>
        </div>
      )}

      {/* ── Mode visuel : uniquement langue + profondeur + multi-participants ── */}
      {isQuiz && (
        <div className="space-y-4 [@media(max-height:620px)]:space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 [@media(max-height:620px)]:gap-2">
            <div className="space-y-4 [@media(max-height:620px)]:space-y-1.5">
              <LanguagePicker />
              <DepthSelector value={depth} onChange={setDepth} />
            </div>
            <div className="space-y-4 [@media(max-height:620px)]:space-y-1.5">
              {/* Fullscreen toggle */}
              <div className="space-y-1.5 [@media(max-height:620px)]:space-y-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary/60 font-bold [@media(max-height:620px)]:hidden">
                  Affichage
                </p>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="w-full flex items-center justify-between px-3 py-2 [@media(max-height:620px)]:py-1.5 rounded-lg border border-primary/15 brand-surface-softer hover:bg-primary/5 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <MaterialIcon name={isFullscreen ? "fullscreen_exit" : "fullscreen"} className="text-primary text-[18px]" />
                    <span className="text-xs font-semibold text-primary">
                      {isFullscreen ? t("configure.fullscreenExit") : t("configure.fullscreenEnter")}
                    </span>
                  </div>
                  <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${isFullscreen ? "bg-primary" : "bg-primary/20"}`}>
                    <div className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform duration-200 ${isFullscreen ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* ── Nombre de personnes ── */}
          <div className="space-y-2 [@media(max-height:620px)]:space-y-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary/60 font-bold">
              {t("configure.participantCountTitle")}
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setParticipantCount(n)}
                  className={`flex-1 py-2.5 [@media(max-height:620px)]:py-1.5 rounded-lg border-2 text-sm font-bold transition-all ${
                    participantCount === n
                      ? "border-primary bg-primary text-white shadow-md"
                      : "border-primary/15 brand-surface-softer text-primary/70 hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* ── Sélection des couleurs (si > 1 participant) ── */}
          {participantCount > 1 && (
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary/60 font-bold">
                {t("configure.participantColorTitle")}
              </p>
              {Array.from({ length: participantCount }).map((_, idx) => {
                const chosen = selectedColors[idx] ?? "";
                const colorDef = PARTICIPANT_COLORS.find((c) => c.id === chosen);
                return (
                  <div key={idx} className="space-y-1.5">
                    <p className="text-[11px] text-primary/50 font-medium px-0.5">
                      {t("configure.participantLabel").replace("{n}", String(idx + 1))}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {PARTICIPANT_COLORS.map((color) => {
                        const takenByOther = usedColors(idx).includes(color.id);
                        const isSelected = chosen === color.id;
                        return (
                          <button
                            key={color.id}
                            type="button"
                            disabled={takenByOther}
                            onClick={() => handleColorSelect(idx, color.id)}
                            style={{
                              backgroundColor: color.bg,
                              color: color.text,
                              borderColor: isSelected ? color.text : "transparent",
                              opacity: takenByOther ? 0.3 : 1,
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                              isSelected ? "ring-2 ring-offset-1" : "hover:scale-105"
                            } disabled:cursor-not-allowed`}
                          >
                            {t(color.labelKey)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {!colorsValid && (
                <p className="text-[11px] text-amber-600 font-medium">
                  {t("configure.participantColorError")}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Continue button ── */}
      <button
        disabled={!isFormComplete}
        onClick={handleContinue}
        className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2.5 sm:py-3 [@media(max-height:620px)]:py-2 rounded-lg shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <span>{t("configure.start")}</span>
        <MaterialIcon name="arrow_forward" />
      </button>
    </div>
  );
}
