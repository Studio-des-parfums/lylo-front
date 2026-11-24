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
      <RoomEventLogger />
      <DataChannelListener />
      <TranscriptionListener />
      <ClickModeController />
      <PerfumeNameController />
      {children}
    </LiveKitRoom>
  );
}
