"use client";

import { ReactNode, useEffect, useCallback } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useDataChannel,
  useRoomContext,
  useStartAudio,
} from "@livekit/components-react";
import { RoomEvent, ParticipantEvent, TranscriptionSegment, Participant, RoomOptions } from "livekit-client";
import { useSession } from "@/context/SessionContext";
import { useTranslation } from "@/i18n/LanguageContext";

function DataChannelListener() {
  const { handleDataMessage } = useSession();

  const onMessage = useCallback(
    (msg: { payload: Uint8Array }) => {
      handleDataMessage(msg.payload);
    },
    [handleDataMessage]
  );

  useDataChannel("state", onMessage);

  return null;
}


function ClickModeController() {
  const { pendingClickAnswer, clearPendingClickAnswer } = useSession();
  const { send } = useDataChannel("control");

  useEffect(() => {
    if (!pendingClickAnswer) return;
    console.warn("📤 [CLICK MODE] Envoi réponse via data channel 'control':", pendingClickAnswer);
    const msg = new TextEncoder().encode(JSON.stringify(pendingClickAnswer));
    send(msg, { reliable: true });
    clearPendingClickAnswer();
  }, [pendingClickAnswer, send, clearPendingClickAnswer]);

  return null;
}

function PerfumeNameController() {
  const { pendingPerfumeName, clearPendingPerfumeName } = useSession();
  const { send } = useDataChannel("control");

  useEffect(() => {
    if (!pendingPerfumeName) return;
    console.warn("📤 [PERFUME NAME] Envoi via data channel 'control':", pendingPerfumeName);
    const msg = new TextEncoder().encode(JSON.stringify(pendingPerfumeName));
    send(msg, { reliable: true });
    clearPendingPerfumeName();
  }, [pendingPerfumeName, send, clearPendingPerfumeName]);

  return null;
}

function RoomEventLogger() {
  const room = useRoomContext();
  const { handleConnectionTimeout } = useSession();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (room.state !== "connected") {
        handleConnectionTimeout();
      }
    }, 10000);

    const onConnected = () => {
      clearTimeout(timeout);
      console.log("[LiveKit] Room connected");
    };
    const onDisconnected = (reason?: unknown) => console.log("[LiveKit] Room disconnected, reason:", reason);
    const onReconnecting = () => console.log("[LiveKit] Room reconnecting...");
    const onReconnected = () => console.log("[LiveKit] Room reconnected");
    const onConnectionStateChanged = (state: string) =>
      console.log("[LiveKit] Connection state →", state);
    const onActiveSpeakersChanged = (speakers: Participant[]) =>
      console.log("[LiveKit] Active speakers:", speakers.map((p) => p.identity));

    const onParticipantConnected = (p: Participant) => {
      console.log("[LiveKit] Participant connected:", p.identity);
      if (p.identity.startsWith("agent_")) {
        p.on(ParticipantEvent.AttributesChanged, (attrs: Record<string, string>) => {
          console.log("[LiveKit] Agent state →", attrs["lk.agent.state"], "| all attrs:", attrs);
        });
      }
    };
    const onParticipantDisconnected = (p: Participant) => console.log("[LiveKit] Participant disconnected:", p.identity);

    room.on(RoomEvent.Connected, onConnected);
    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.Reconnecting, onReconnecting);
    room.on(RoomEvent.Reconnected, onReconnected);
    room.on(RoomEvent.ConnectionStateChanged, onConnectionStateChanged);
    room.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);
    room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);

    for (const p of room.remoteParticipants.values()) {
      if (p.identity.startsWith("agent_")) {
        console.log("[LiveKit] Agent already present:", p.identity, "| state:", p.attributes?.["lk.agent.state"]);
        p.on(ParticipantEvent.AttributesChanged, (attrs: Record<string, string>) => {
          console.log("[LiveKit] Agent state →", attrs["lk.agent.state"], "| all attrs:", attrs);
        });
      }
    }

    return () => {
      clearTimeout(timeout);
      room.off(RoomEvent.Connected, onConnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.Reconnecting, onReconnecting);
      room.off(RoomEvent.Reconnected, onReconnected);
      room.off(RoomEvent.ConnectionStateChanged, onConnectionStateChanged);
      room.off(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);
      room.off(RoomEvent.ParticipantConnected, onParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
    };
  }, [room, handleConnectionTimeout]);

  return null;
}

function TranscriptionListener() {
  const room = useRoomContext();
  const { upsertTranscript } = useSession();

  useEffect(() => {
    const handleTranscription = (
      segments: TranscriptionSegment[],
      participant?: Participant
    ) => {
      const sender = participant?.isLocal
        ? ("user" as const)
        : ("agent" as const);

      for (const segment of segments) {
        upsertTranscript({
          id: segment.id,
          sender,
          text: segment.text,
          timestamp: segment.firstReceivedTime ?? Date.now(),
        });
      }
    };

    room.on(RoomEvent.TranscriptionReceived, handleTranscription);
    return () => {
      room.off(RoomEvent.TranscriptionReceived, handleTranscription);
    };
  }, [room, upsertTranscript]);

  return null;
}

/**
 * Force la sortie audio (RoomAudioRenderer) sur un casque/enceinte Bluetooth au lieu du
 * haut-parleur interne par défaut choisi par l'OS.
 *
 * Pourquoi c'est nécessaire : dès que la page capture le micro (LiveKitRoom audio={true}),
 * l'OS bascule le Bluetooth du profil A2DP (sortie seule, haute qualité) vers HFP/mains-libres
 * (entrée+sortie, SCO). Beaucoup de tablettes gèrent mal ce switch et retombent sur le
 * haut-parleur interne pour la sortie, même si le device Bluetooth reste connecté.
 *
 * Important : `room.getActiveDevice("audiooutput")` ne lit PAS l'état réel de l'OS — c'est
 * juste le dernier device que le SDK a lui-même sélectionné via switchActiveDevice/devicechange.
 * Si l'OS fait silencieusement retomber le son sur le haut-parleur (SCO qui lâche), ce champ
 * continue de pointer vers le Bluetooth : comparer dessus pour décider de ne "rien faire"
 * est donc un faux négatif. setSinkId (sortie) seul ne force pas non plus l'OS à ré-ouvrir
 * SCO ; ce qui la redéclenche, c'est le redémarrage du track d'ENTRÉE micro. On force donc
 * systématiquement les deux à chaque tentative, sans se fier à l'état mémorisé du SDK.
 */
function BluetoothOutputEnforcer() {
  const room = useRoomContext();

  useEffect(() => {
    let cancelled = false;

    const isLikelyBluetooth = (label: string) => {
      const l = label.toLowerCase();
      return (
        l.includes("bluetooth") ||
        l.includes("headset") ||
        l.includes("casque") ||
        l.includes("airpods") ||
        l.includes("earbuds") ||
        l.includes("buds")
      );
    };

    const applyOutputDevice = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter((d) => d.kind === "audiooutput");
        const inputs = devices.filter((d) => d.kind === "audioinput");
        // "default"/"communications" sont des alias virtuels ajoutés par Chrome, pas de vrais
        // périphériques : on ne veut que les entrées physiques pour repérer le casque.
        const realOutputs = outputs.filter(
          (d) => d.deviceId !== "default" && d.deviceId !== "communications"
        );
        const realInputs = inputs.filter(
          (d) => d.deviceId !== "default" && d.deviceId !== "communications"
        );

        if (realOutputs.length === 0) return;

        // Cas nominal : le label du device est disponible (permission micro déjà accordée
        // pour cette origine) → on peut identifier le casque par son nom.
        let targetOutput = realOutputs.find((d) => isLikelyBluetooth(d.label));
        let targetInput = realInputs.find((d) => isLikelyBluetooth(d.label));

        // Cas dégradé : labels vides (permission tout juste accordée, pas encore propagée
        // à enumerateDevices — fréquent sur un domaine de prod jamais visité auparavant, par
        // opposition à un domaine ngrok déjà autorisé sur cette tablette). On ne peut plus
        // identifier le casque par son nom ; s'il n'y a qu'un seul device de sortie non-défaut,
        // c'est très probablement lui (le haut-parleur interne est en général exposé comme
        // "default" et n'apparaît pas séparément une fois un device externe connecté).
        if (!targetOutput && realOutputs.length === 1 && !realOutputs[0].label) {
          targetOutput = realOutputs[0];
        }
        if (!targetInput && realInputs.length === 1 && !realInputs[0].label) {
          targetInput = realInputs[0];
        }

        if (!targetOutput) return;

        console.log(
          "[LiveKit] Forçage sortie Bluetooth →",
          targetOutput.label || targetOutput.deviceId,
          "| sdk pense actuellement:",
          room.getActiveDevice("audiooutput")
        );
        // On ne regarde jamais getActiveDevice pour décider de sauter cet appel : voir le
        // commentaire au-dessus du composant — cet état peut mentir après un flip SCO silencieux.
        await room.switchActiveDevice("audiooutput", targetOutput.deviceId);

        // Le vrai déclencheur de la renégociation SCO côté OS est le redémarrage du track
        // d'ENTRÉE micro (pas seulement le changement de sink de sortie) — sans ça, l'OS peut
        // rester sur le haut-parleur même si le SDK pointe "correctement" vers le Bluetooth.
        if (targetInput) {
          console.log("[LiveKit] Redémarrage du track micro pour forcer la renégociation SCO →", targetInput.label || targetInput.deviceId);
          await room.switchActiveDevice("audioinput", targetInput.deviceId);
        }
      } catch (err) {
        console.warn("[LiveKit] Impossible de forcer la sortie audio sur le casque Bluetooth:", err);
      }
    };

    // Plusieurs tentatives espacées : à la connexion, les labels des devices peuvent ne pas
    // encore être disponibles (permission micro tout juste accordée, pas encore propagée à
    // enumerateDevices), et l'OS re-route souvent l'audio juste après l'activation du micro
    // (bascule A2DP → HFP). On réessaie donc plusieurs fois plutôt qu'une seule — et comme on
    // ne se fie plus à getActiveDevice pour sauter une tentative "déjà bonne", chaque passage
    // redemande réellement SCO au lieu de ne rien faire par faux négatif.
    const scheduleAttempts = [0, 800, 1800, 3500, 6000];
    const timeouts = scheduleAttempts.map((delay) =>
      setTimeout(() => {
        if (!cancelled) applyOutputDevice();
      }, delay)
    );

    // Et on réagit à tout changement de devices en cours de session (reconnexion casque, etc.)
    const onDeviceChange = () => applyOutputDevice();
    navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange);

    // Log diagnostic propre : ne reflète que ce que le SDK a lui-même observé (pas un vrai
    // signal de l'état OS, voir le commentaire du composant), mais utile pour corréler avec
    // les tentatives ci-dessus pendant les tests.
    const onActiveDeviceChanged = (kind: string, deviceId: string) => {
      console.log("[LiveKit][sdk] device actif changé →", kind, deviceId);
    };
    room.on(RoomEvent.ActiveDeviceChanged, onActiveDeviceChanged);

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange);
      room.off(RoomEvent.ActiveDeviceChanged, onActiveDeviceChanged);
    };
  }, [room]);

  return null;
}

function AudioUnlockButton() {
  const { t } = useTranslation();
  const room = useRoomContext();
  const { mergedProps, canPlayAudio } = useStartAudio({
    room,
    props: {
      type: "button",
    },
  });

  if (canPlayAudio) return null;

  return (
    <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4 pointer-events-none">
      <button
        {...mergedProps}
        className="pointer-events-auto rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
      >
        {t("interaction.enableAudio")}
      </button>
    </div>
  );
}


interface LiveKitSessionProps {
  children: ReactNode;
}

export default function LiveKitSession({ children }: LiveKitSessionProps) {
  const { sessionData } = useSession();

  if (!sessionData) {
    return <>{children}</>;
  }

  const roomOptions: RoomOptions = {
    reconnectPolicy: {
      nextRetryDelayInMs: ({ retryCount, elapsedMs }) => {
        if (elapsedMs > 120_000) return null;
        return Math.min(1000 * 2 ** retryCount, 10_000);
      },
    },
  };

  return (
    <LiveKitRoom
      serverUrl={sessionData.livekit_url}
      token={sessionData.token}
      audio={true}
      video={false}
      connect={true}
      options={roomOptions}
    >
      <RoomAudioRenderer />
      <AudioUnlockButton />
      <BluetoothOutputEnforcer />
      <RoomEventLogger />
      <DataChannelListener />
      <TranscriptionListener />
      <ClickModeController />
      <PerfumeNameController />
      {children}
    </LiveKitRoom>
  );
}
