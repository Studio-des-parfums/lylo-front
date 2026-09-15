"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Button from "@/components/ui/Button";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { useTranslation, type Locale } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { persistLanguage } from "@/lib/language";
import { activeBrand } from "@/lib/brand";

const isEster = activeBrand.id === "ester";

const ESTER_INTRO_AUDIO_BY_LOCALE: Record<Locale, string> = {
  en: "/EL-EN.mp3",
  fr: "/EL-FR.mp3",
  nl: "/EL-NL.mp3",
  it: "/EL-IT.mp3",
  es: "/EL-ES.mp3",
  de: "/EL-AL.mp3",
  ar: "/EL-CH.mp3",
};

const LYLO_INTRO_AUDIO_BY_LOCALE: Partial<Record<Locale, string>> = {
  en: "/intro-girl-en.wav",
  fr: "/intro-girl-fr.wav",
};

export default function HeroSection() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { user, openLoginModal } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayAudio = () => {
    // TODO(diagnostic-bluetooth): log temporaire — liste les devices audio au moment précis
    // où l'intro (qui sort bien dans le casque) est lancée, pour comparer avec l'état vu
    // pendant une session LiveKit. À retirer une fois le diagnostic terminé.
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const outputs = devices
            .filter((d) => d.kind === "audiooutput")
            .map((d) => ({ id: d.deviceId, label: d.label || "(vide)" }));
          console.log("[Intro][diag] audiooutput devices (lecture intro wav):", outputs);
        })
        .catch((err) => console.warn("[Intro][diag] enumerateDevices a échoué:", err));
    }

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }
    const audioFile = isEster
      ? ESTER_INTRO_AUDIO_BY_LOCALE[locale] ?? ESTER_INTRO_AUDIO_BY_LOCALE.en
      : LYLO_INTRO_AUDIO_BY_LOCALE[locale] ?? LYLO_INTRO_AUDIO_BY_LOCALE.en!;
    const audio = new Audio(audioFile);
    audioRef.current = audio;
    setIsPlaying(true);
    audio.play();
    audio.onended = () => setIsPlaying(false);
  };

  return (
    <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 hero-gradient" />

      {/* Content */}
      <div className="relative z-10 px-6 text-center max-w-4xl mx-auto">
        {isEster ? (
          /* Logo (Estée Lauder, large, no text title) */
          <div className="flex justify-center mb-8">
            <Image src={activeBrand.logo} alt="Logo Estée Lauder" width={801} height={101} className="w-[280px] md:w-[400px] lg:w-[520px] h-auto" priority />
          </div>
        ) : (
          <>
            {/* Logo */}
            <div className="flex justify-center items-center gap-4 mb-6">
              <Image src={activeBrand.logo} alt={`Logo ${activeBrand.name}`} width={72} height={72} style={{ width: "auto", height: "auto" }} />
              <span className="text-primary text-2xl font-light">×</span>
              <Image src="/logo-lampions.png" alt="Logo Lampion" width={100} height={100} style={{ width: "auto", height: "auto" }} />
            </div>

            {/* Title */}
            <h1 className="text-white font-light tracking-tight mb-4 font-display flex flex-col items-center leading-tight">
              <span className="text-4xl md:text-5xl lg:text-7xl">{activeBrand.name}</span>
              <span className="text-xl md:text-2xl lg:text-3xl font-medium">{t("home.byWord")}</span>
              <span className="text-4xl md:text-5xl lg:text-7xl">{t("home.title")}</span>
            </h1>
          </>
        )}

        {/* Badge */}
        {isEster ? (
          <>
            <p className="text-white/80 text-base md:text-lg font-light mb-2 max-w-xl mx-auto">
              {t("home.esterTagline")}
            </p>
            <p className="text-white/60 text-sm md:text-base font-light mb-6 max-w-xl mx-auto">
              {t("home.esterFloatingLabel")}
            </p>
          </>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-widest uppercase mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            {t("home.badge")}
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {user ? (
            <Button variant="primary" size="lg" className="shadow-2xl shadow-black/20 hover:scale-[1.02]" onClick={() => { persistLanguage(locale === "en" ? "en" : "fr"); router.push("/configure"); }}>
              <MaterialIcon name="auto_awesome" />
              {t("home.getStarted")}
            </Button>
          ) : (
            <Button variant="primary" size="lg" className="shadow-2xl shadow-black/20 hover:scale-[1.02]" onClick={openLoginModal}>
              <MaterialIcon name="login" />
              {t("nav.login")}
            </Button>
          )}
          <Button variant="ghost" size="lg" onClick={handlePlayAudio}>
            {isPlaying ? (
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <MaterialIcon name="play_circle" />
            )}
            {isPlaying ? t("home.playing") : t("home.introduction")}
          </Button>
        </div>
      </div>

      {/* Floating tech element */}
      {!isEster && (
        <div className="absolute bottom-10 left-10 hidden lg:block">
          <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-white/60 text-[10px] tracking-widest uppercase">
            {t("home.floatingLabel")}
          </div>
        </div>
      )}
    </div>
  );
}
