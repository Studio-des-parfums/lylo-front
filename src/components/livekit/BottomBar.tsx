"use client";

import { useEffect, useState, useRef } from "react";
import { useDataChannel, useRoomContext } from "@livekit/components-react";
import { Track, RoomEvent } from "livekit-client";
import { useSession } from "@/context/SessionContext";
import { useTranslation } from "@/i18n/LanguageContext";
import MaterialIcon from "@/components/ui/MaterialIcon";
import TranscriptPanel from "@/components/livekit/TranscriptPanel";

function Dots({ dim }: { dim?: boolean }) {
  const base = dim ? "bg-primary/40" : "bg-primary";
  return (
    <div className="flex gap-1 shrink-0">
      <span className={`size-1 ${base} rounded-full animate-bounce`} style={{ animationDuration: "1.5s" }} />
      <span className={`size-1 ${base} rounded-full animate-bounce`} style={{ animationDelay: "0.2s", animationDuration: "1.5s" }} />
      <span className={`size-1 ${base} rounded-full animate-bounce`} style={{ animationDelay: "0.4s", animationDuration: "1.5s" }} />
    </div>
  );
}

export default function BottomBar() {
  const { agentState, currentQuestionIndex, agentName, sessionState } = useSession();
  const { t } = useTranslation();
  const { send } = useDataChannel("control");
  const room = useRoomContext();
  const [interrupted, setInterrupted] = useState(false);
  // Initialisé depuis l'état réel de la track micro (pas toujours false) — sinon, en cas de
  // remontage du composant (changement de page) alors que le micro était mute, l'icône
  // affichait "actif" par défaut, désynchronisée du vrai état.
  const [muted, setMuted] = useState(
    () => room.localParticipant.getTrackPublication(Track.Source.Microphone)?.isMuted ?? false
  );
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [resumeAsked, setResumeAsked] = useState(false);

  // Reste synchronisé avec l'état réel de la track, y compris quand elle change ailleurs
  // qu'via handleMicToggle (ex: mute forcé par handleInterrupt, ou track pas encore publiée
  // au premier rendu).
  useEffect(() => {
    const syncMuted = () => {
      const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (pub) setMuted(pub.isMuted);
    };
    syncMuted();
    room.on(RoomEvent.TrackMuted, syncMuted);
    room.on(RoomEvent.TrackUnmuted, syncMuted);
    room.on(RoomEvent.LocalTrackPublished, syncMuted);
    return () => {
      room.off(RoomEvent.TrackMuted, syncMuted);
      room.off(RoomEvent.TrackUnmuted, syncMuted);
      room.off(RoomEvent.LocalTrackPublished, syncMuted);
    };
  }, [room]);

  // Écoute directement les events "state" pour réafficher le bouton à chaque standby,
  // même si sessionState était déjà "standby" (React ne re-déclenche pas l'effect dans ce cas)
  useDataChannel("state", (msg) => {
    try {
      const event = JSON.parse(new TextDecoder().decode(msg.payload));
      if (event.type === "state_change" && event.state === "standby") {
        setResumeAsked(false);
      }
    } catch {
      // ignore
    }
  });

  // Question suivante → reset état
  const prevQuestionIndex = useRef(currentQuestionIndex);
  useEffect(() => {
    if (prevQuestionIndex.current !== currentQuestionIndex) {
      prevQuestionIndex.current = currentQuestionIndex;
      room.localParticipant.getTrackPublication(Track.Source.Microphone)?.unmute();
      setInterrupted(false);
      setMuted(false);
    }
  }, [currentQuestionIndex, room]);

  const canInterrupt = !interrupted && agentState === "speaking";

  const handleInterrupt = () => {
    send(new TextEncoder().encode(JSON.stringify({ type: "interrupt" })), { reliable: true });
    room.localParticipant.getTrackPublication(Track.Source.Microphone)?.mute();
    setInterrupted(true);
  };

  const handleResumeListen = () => {
    send(new TextEncoder().encode(JSON.stringify({ type: "resume_listen" })), { reliable: true });
    room.localParticipant.getTrackPublication(Track.Source.Microphone)?.unmute();
    setInterrupted(false);
  };

  const handleResume = () => {
    send(new TextEncoder().encode(JSON.stringify({ type: "resume" })), { reliable: true });
    setResumeAsked(true);
  };

  const handleMicToggle = () => {
    const newMuted = !muted;
    const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
    if (newMuted) pub?.mute(); else pub?.unmute();
    setMuted(newMuted);
  };

  const renderStatus = () => {
    if (agentState === "initializing") {
      return (
        <>
          <Dots />
          <span className="text-[11px] tracking-wider italic font-light lowercase truncate">
            {t("interaction.connecting")}
          </span>
        </>
      );
    }
    if (agentState === "speaking") {
      return (
        <>
          <Dots />
          <span className="text-[11px] tracking-wider italic font-light lowercase truncate">
            {t("interaction.agentSpeaking").replace("{name}", agentName)}
          </span>
        </>
      );
    }
    if (agentState === "thinking") {
      return (
        <>
          <Dots dim />
          <span className="text-[11px] tracking-wider italic font-light lowercase truncate text-primary/60">
            {t("interaction.agentThinking")}
          </span>
        </>
      );
    }
    if (agentState === "listening") {
      return (
        <>
          <MaterialIcon name="mic" className="text-[15px] animate-pulse shrink-0" />
          <span className="text-[11px] tracking-wider font-medium lowercase truncate">
            {t("interaction.agentListening")}
          </span>
        </>
      );
    }
    return (
      <>
        <MaterialIcon name="mic_off" className="text-[15px] shrink-0 text-primary/40" />
        <span className="text-[11px] tracking-wider italic font-light lowercase truncate text-primary/40">
          {t("interaction.agentIdle")}
        </span>
      </>
    );
  };

  const iconBtn = "size-9 sm:size-11 flex items-center justify-center rounded-full transition-colors cursor-pointer";

  return (
    <>
      <div className="flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-2 sm:py-2.5 rounded-full bg-white/90 backdrop-blur-md border border-primary/15 shadow-lg shadow-primary/10 text-primary w-72 sm:w-96">
        {/* Gauche : Stop / Reprendre */}
        <div className="w-9 sm:w-11 flex justify-center shrink-0">
          {interrupted ? (
            <button onClick={handleResumeListen} className={iconBtn} title={t("interaction.resume")}>
              <MaterialIcon name="play_circle" className="text-[22px] sm:text-[26px]" />
            </button>
          ) : canInterrupt ? (
            <button onClick={handleInterrupt} className={iconBtn} title={t("interaction.stop")}>
              <MaterialIcon name="stop_circle" className="text-[22px] sm:text-[26px]" />
            </button>
          ) : (
            <div className="size-9 sm:size-11" />
          )}
        </div>

        <div className="w-px h-4 sm:h-5 bg-primary/20 shrink-0 mx-1" />

        {/* Centre : statut ou bouton "j'ai une question" */}
        <div className="flex items-center gap-1.5 px-1 flex-1 min-w-0">
          {sessionState === "standby" && !resumeAsked ? (
            <button
              onClick={handleResume}
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-opacity"
              title={t("interaction.resumeQuestion")}
            >
              <MaterialIcon name="mic" className="text-[15px] shrink-0 animate-pulse" />
              <span className="text-[11px] tracking-wider font-medium lowercase truncate">
                {t("interaction.resumeQuestion")}
              </span>
            </button>
          ) : (
            renderStatus()
          )}
        </div>

        <div className="w-px h-4 sm:h-5 bg-primary/20 shrink-0 mx-1" />

        {/* Droite : micro + conversation */}
        <div className="flex items-center shrink-0">
          <button
            onClick={handleMicToggle}
            className={`${iconBtn} ${muted ? "text-red-500 hover:bg-red-50" : "hover:bg-primary/10"}`}
            title={muted ? t("interaction.micEnable") : t("interaction.micDisable")}
          >
            <MaterialIcon name={muted ? "mic_off" : "mic"} className="text-[22px] sm:text-[26px]" />
          </button>
          <button
            onClick={() => setTranscriptOpen((p) => !p)}
            className={`${iconBtn} hover:bg-primary/10`}
            title={t("transcript.title")}
          >
            <MaterialIcon name={transcriptOpen ? "close" : "chat"} className="text-[22px] sm:text-[26px]" />
          </button>
        </div>
      </div>

      <TranscriptPanel open={transcriptOpen} onToggle={() => setTranscriptOpen((p) => !p)} />
    </>
  );
}
