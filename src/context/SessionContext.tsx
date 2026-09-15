"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { MOCK_FORMULAS, MOCK_QUESTIONS } from "@/lib/mockData";
import { persistLanguage, resolveStoredLanguage } from "@/lib/language";
import { activeBrand } from "@/lib/brand";

export const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

export type SessionState =
  | "idle"
  | "connecting"
  | "collecting_profile"
  | "questionnaire"
  | "generating_formulas"
  | "completed"
  | "customization"
  | "standby"
  | "awaiting_confirmation"
  | "asking_intensity";

export type AgentState = "speaking" | "listening" | "thinking" | "idle" | "initializing";

export interface ProfileUpdate {
  field: string;
  value: string;
  profile_complete: boolean;
  missing_fields: string[];
}

export interface AnswerSaved {
  question_id: number;
  top_2: string[];
  bottom_2: string[];
}

export interface FormulaNote {
  name: string;
  ml: number;
  family?: string;
  description?: string;
  note_type?: string;
  priority?: string;
  // Jusqu'à 2 alternatives proposées par le LLM au moment de la génération — permet de
  // remplacer cette note dans l'écran de personnalisation sans repasser par une recherche.
  alternatives?: FormulaNote[];
}

export interface FormulaSize {
  target_ml: number;
  top_notes: FormulaNote[];
  heart_notes: FormulaNote[];
  base_notes: FormulaNote[];
  boosters: FormulaNote[];
}

export interface Formula {
  // Lylo — formule générée sur-mesure
  profile?: string;
  description?: string;
  score?: number;
  top_notes?: string[];
  heart_notes?: string[];
  base_notes?: string[];
  sizes?: {
    "10ml": FormulaSize;
    "30ml": FormulaSize;
    "50ml": FormulaSize;
  };
  // Ester — parfum sélectionné dans le catalogue
  source?: "catalog";
  brand?: string;
  name?: string;
  family?: string;
  match_reason?: string;
  image_url?: string;
}

export function isCatalogFormula(formula: Formula): boolean {
  return formula.source === "catalog";
}

export interface Choice {
  label: string;
  image: string;
}

export interface PendingClickAnswer {
  type: "questionnaire_top_2" | "questionnaire_bottom_2";
  question_id: number;
  values: string[];
  top_2?: string[];
}

export interface Question {
  id: number;
  question: string;
  choices: Choice[];
}

export interface TranscriptMessage {
  id: string;
  sender: "agent" | "user";
  text: string;
  timestamp: number;
}

interface SessionData {
  session_id: string;
  room_name: string;
  token: string;
  livekit_url: string;
  identity: string;
}

interface SessionContextType {
  sessionData: SessionData | null;
  sessionState: SessionState;
  agentState: AgentState;
  profile: Record<string, string>;
  missingFields: string[];
  answers: AnswerSaved[];
  formulas: Formula[];
  // Référence en base de la formule sélectionnée (mode vocal) — remplie par select_formula
  // côté agent, utilisée pour l'envoi par mail à la demande (SendFormulaMailButton).
  formulaReference: string | null;
  transcripts: TranscriptMessage[];
  questions: Question[];
  currentQuestionIndex: number;
  questionCount: number;
  agentName: string;
  hiddenChoices: string[];
  requestingEmail: boolean;
  devMode: boolean;
  noCreditsError: boolean;
  connectionError: boolean;
  clickSelectionMode: "top_2" | "bottom_2" | null;
  pendingClickAnswer: PendingClickAnswer | null;
  confirmationData: { question_id: number; top_2: string[]; bottom_2: string[] } | null;
  avatarDisabled: boolean;
  setConnectionError: (v: boolean) => void;
  startSession: () => Promise<void>;
  endSession: () => void;
  handleConnectionTimeout: () => void;
  setSessionState: (state: SessionState) => void;
  handleDataMessage: (payload: Uint8Array) => void;
  upsertTranscript: (msg: TranscriptMessage) => void;
  submitClickAnswer: (values: string[]) => void;
  clearPendingClickAnswer: () => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>(DEV_MODE ? "completed" : "idle");
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [answers, setAnswers] = useState<AnswerSaved[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>(DEV_MODE ? MOCK_FORMULAS : []);
  const [formulaReference, setFormulaReference] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  const [questions, setQuestions] = useState<Question[]>(DEV_MODE ? MOCK_QUESTIONS : []);
  const questionsRef = useRef<Question[]>(questions);
  questionsRef.current = questions;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionCount, setQuestionCount] = useState(DEV_MODE ? MOCK_QUESTIONS.length : 0);
  const [agentName, setAgentName] = useState("Rose");
  const [hiddenChoices, setHiddenChoices] = useState<string[]>([]);
  const [requestingEmail, setRequestingEmail] = useState(false);
  const [noCreditsError, setNoCreditsError] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>("initializing");
  const isRetryingRef = useRef(false);
  const [clickSelectionMode, setClickSelectionMode] = useState<"top_2" | "bottom_2" | null>(null);
  const [clickQuestionId, setClickQuestionId] = useState<number | null>(null);
  const [clickTop2Values, setClickTop2Values] = useState<string[]>([]);
  const [pendingClickAnswer, setPendingClickAnswer] = useState<PendingClickAnswer | null>(null);
  const [confirmationData, setConfirmationData] = useState<{ question_id: number; top_2: string[]; bottom_2: string[] } | null>(null);
  const [avatarDisabled, setAvatarDisabled] = useState(false);

  const startSession = useCallback(async () => {
    if (DEV_MODE) return;
    setSessionState("connecting");

    const language = resolveStoredLanguage();
    persistLanguage(language);
    const voice_gender =
      (localStorage.getItem("persona") as "female" | "male") || "female";
    setAgentName(voice_gender === "male" ? "Florian" : "Rose");
    const depth = localStorage.getItem("depth") || "1";
    const question_count = parseInt(depth, 10);
    setQuestionCount(question_count);
    const mode = localStorage.getItem("mode") || "guided";
    const input_mode = (localStorage.getItem("input_mode") as "voice" | "click") || "voice";
    const avatar = localStorage.getItem("avatar") !== "false";
    const email = localStorage.getItem("recap_email") || null;

    const res = await fetch(`${API_BASE}/api/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, voice_gender, question_count, mode, input_mode, brand: activeBrand.id, email, avatar }),
    });

    if (res.status === 403) {
      setNoCreditsError(true);
      setSessionState("idle");
      return;
    }

    const data: SessionData = await res.json();
    setSessionData(data);
    setSessionState("collecting_profile");

    // Fetch questions for this session
    const sessionRes = await fetch(`${API_BASE}/api/session/${data.session_id}`);
    const sessionInfo = await sessionRes.json();
    if (sessionInfo.questions) {
      setQuestions(sessionInfo.questions);
      setQuestionCount(sessionInfo.questions.length);
    }
  }, []);

  const handleDataMessage = useCallback((payload: Uint8Array) => {
    try {
      const event = JSON.parse(new TextDecoder().decode(payload));
      console.log("[LiveKit] data channel event:", event);

      switch (event.type) {
        case "profile_update":
          console.log("[LiveKit] profile_update →", event.field, "=", event.value, "| missing:", event.missing_fields);
          setProfile((prev) => ({
            ...prev,
            [event.field]: event.value,
          }));
          setMissingFields(event.missing_fields || []);
          break;

        case "state_change":
          console.log("[LiveKit] state_change →", event.state);
          setSessionState(event.state as SessionState);
          break;

        case "top_2_selected":
          console.log("[LiveKit] top_2_selected →", event.top_2);
          setHiddenChoices(event.top_2 || []);
          break;

        case "answer_saved": {
          console.log("[LiveKit] answer_saved → question_id:", event.question_id, "top_2:", event.top_2, "bottom_2:", event.bottom_2);
          setHiddenChoices([]);
          setConfirmationData(null);
          setSessionState("questionnaire");
          setAnswers((prev) => {
            return [
              ...prev.filter((a) => a.question_id !== event.question_id),
              {
                question_id: event.question_id,
                top_2: event.top_2,
                bottom_2: event.bottom_2,
              },
            ];
          });
          // L'index affiché est dérivé de la position réelle de la question
          // répondue dans la liste, pas d'un simple compteur — un compteur
          // aveugle dérive silencieusement si un événement est manqué/dupliqué.
          const answeredIndex = questionsRef.current.findIndex((q) => q.id === event.question_id);
          if (answeredIndex !== -1) {
            setCurrentQuestionIndex(answeredIndex + 1);
          }
          break;
        }

        case "formulas_generated":
          console.log("[LiveKit] formulas_generated →", event.formulas?.length, "formulas");
          setFormulas(event.formulas || []);
          setSessionState("completed");
          break;

        case "formula_selected":
          console.log("[LiveKit] formula_selected →", event.formula?.profile);
          setFormulas([event.formula]);
          if (event.reference) setFormulaReference(event.reference);
          setSessionState("customization");
          break;

        case "formula_updated":
          console.log("[LiveKit] formula_updated →", event.formula?.profile);
          setFormulas([event.formula]);
          break;

        case "agent_state":
          console.log("[LiveKit] agent_state →", event.state);
          setAgentState(event.state as AgentState);
          break;

        case "waiting_for_top_2":
          console.warn("🟡 [CLICK MODE] waiting_for_top_2 reçu → question_id:", event.question_id, "| clickSelectionMode → top_2");
          setClickSelectionMode("top_2");
          setClickQuestionId(event.question_id);
          break;

        case "waiting_for_bottom_2":
          console.warn("🟡 [CLICK MODE] waiting_for_bottom_2 reçu → question_id:", event.question_id, "| clickSelectionMode → bottom_2");
          setClickSelectionMode("bottom_2");
          setClickQuestionId(event.question_id);
          break;

        case "step_awaiting_confirmation":
          console.log("[LiveKit] step_awaiting_confirmation →", event.question_id, event.top_2, event.bottom_2);
          setConfirmationData({ question_id: event.question_id, top_2: event.top_2 || [], bottom_2: event.bottom_2 || [] });
          setSessionState("awaiting_confirmation");
          break;

        case "step_asking_intensity":
          console.log("[LiveKit] step_asking_intensity");
          setSessionState("asking_intensity");
          break;

        case "requesting_email":
          console.log("[LiveKit] requesting_email →", event.requesting_email);
          if (event.requesting_email) setRequestingEmail(true);
          break;

        case "avatar_disabled":
          console.log("[LiveKit] avatar_disabled →", event.reason ?? "disconnected");
          setAvatarDisabled(true);
          break;

        default:
          console.warn("[LiveKit] unknown event type:", event.type, event);
      }
    } catch {
      // ignore malformed messages
    }
  }, []);

  const submitClickAnswer = useCallback((values: string[]) => {
    if (clickSelectionMode === "top_2") {
      setClickTop2Values(values);
      setPendingClickAnswer({
        type: "questionnaire_top_2",
        question_id: clickQuestionId!,
        values,
      });
    } else if (clickSelectionMode === "bottom_2") {
      setPendingClickAnswer({
        type: "questionnaire_bottom_2",
        question_id: clickQuestionId!,
        values,
        top_2: clickTop2Values,
      });
      setClickTop2Values([]);
    }
    setClickSelectionMode(null);
  }, [clickSelectionMode, clickQuestionId, clickTop2Values]);

  const clearPendingClickAnswer = useCallback(() => {
    setPendingClickAnswer(null);
  }, []);

  const endSession = useCallback(() => {
    isRetryingRef.current = false;
    // Fire-and-forget : on nettoie en fond, pas besoin d'attendre
    if (sessionData?.session_id) {
      fetch(`${API_BASE}/api/session/${sessionData.session_id}`, {
        method: "DELETE",
        keepalive: true,
      });
    }
    setSessionData(null);
    setSessionState("idle");
    setProfile({});
    setMissingFields([]);
    setAnswers([]);
    setFormulas([]);
    setFormulaReference(null);
    setTranscripts([]);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setHiddenChoices([]);
    setRequestingEmail(false);
    setConnectionError(false);
    setAgentState("initializing");
    setClickSelectionMode(null);
    setClickQuestionId(null);
    setClickTop2Values([]);
    setPendingClickAnswer(null);
    setConfirmationData(null);
  }, [sessionData]);

  const handleConnectionTimeout = useCallback(() => {
    if (!isRetryingRef.current) {
      console.log("[LiveKit] Timeout connexion — relance de la session...");
      isRetryingRef.current = true;
      endSession();
      isRetryingRef.current = true; // endSession remet à false, on remet à true
      startSession();
    } else {
      console.log("[LiveKit] Timeout après retry — abandon");
      isRetryingRef.current = false;
      setConnectionError(true);
      endSession();
    }
  }, [endSession, startSession]);

  const upsertTranscript = useCallback((msg: TranscriptMessage) => {
    setTranscripts((prev) => {
      const idx = prev.findIndex((m) => m.id === msg.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], text: msg.text };
        return updated;
      }
      return [...prev, msg];
    });
  }, []);

  return (
    <SessionContext.Provider
      value={{
        sessionData,
        sessionState,
        agentState,
        profile,
        missingFields,
        answers,
        formulas,
        formulaReference,
        transcripts,
        questions,
        currentQuestionIndex,
        questionCount,
        agentName,
        hiddenChoices,
        requestingEmail,
        noCreditsError,
        connectionError,
        setConnectionError,
        devMode: DEV_MODE,
        clickSelectionMode,
        pendingClickAnswer,
        confirmationData,
        avatarDisabled,
        startSession,
        endSession,
        handleConnectionTimeout,
        setSessionState,
        handleDataMessage,
        upsertTranscript,
        submitClickAnswer,
        clearPendingClickAnswer,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
