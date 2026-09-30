"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import AvatarSection from "@/components/interaction/AvatarSection";
import StepProgress from "@/components/interaction/StepProgress";
import ChoiceGrid from "@/components/interaction/ChoiceGrid";
import AnswerConfirmation from "@/components/interaction/AnswerConfirmation";
import IntensitySelector from "@/components/interaction/IntensitySelector";
import PerfumeNameForm from "@/components/interaction/PerfumeNameForm";
import nextDynamic from "next/dynamic";
const BottomBar = nextDynamic(() => import("@/components/livekit/BottomBar"), { ssr: false });
import GeneratingLoader from "@/components/livekit/GeneratingLoader";
import { useTranslation } from "@/i18n/LanguageContext";
import { useSession, DEV_MODE } from "@/context/SessionContext";
import { activeBrand } from "@/lib/brand";

export default function InteractionPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { sessionState, questionCount, questions, currentQuestionIndex, confirmationData, sessionData } = useSession();

  useEffect(() => {
    if (DEV_MODE) return;
    if (sessionState === "completed") {
      router.push("/recommendations");
    }
  }, [sessionState, router]);

  const currentStep = currentQuestionIndex + 1;
  const totalSteps = questionCount || 4;
  const currentQuestion = questions[currentQuestionIndex];

  const persona = typeof window !== "undefined" ? localStorage.getItem("persona") : null;
  const avatarUrl = persona === "male" ? "/avatar-h.jpg" : "/avatar-f.jpg";
  const avatarEnabled = typeof window !== "undefined" ? localStorage.getItem("avatar") !== "false" : true;

  // En mode ester, "asking_intensity" est un signal transitoire avant la
  // recherche catalogue — l'agent ne pose pas la question frais/mix/puissant
  // (non pertinente pour un produit existant), donc on affiche directement
  // le loader plutôt que le sélecteur d'intensité Lylo.
  if (sessionState === "generating_formulas" || (sessionState === "asking_intensity" && activeBrand.id === "ester")) {
    return <GeneratingLoader />;
  }

  return (
    <div className="relative flex h-screen w-full flex-col">
      <Navbar showActions={false} transparent />

      <main className="flex-1 flex flex-col items-center justify-between px-4 pb-2 pt-1 max-w-6xl mx-auto w-full min-h-0 relative z-10">
        {/* Avatar + Question */}
        <div className="w-full flex flex-col items-center gap-1 shrink-0 mt-14 sm:mt-10">
          <AvatarSection
            name=""
            role=""
            imageUrl={avatarUrl}
            avatarEnabled={avatarEnabled}
          />
          <StepProgress currentStep={currentStep} totalSteps={totalSteps} />
          <h3 className="text-2xl md:text-3xl font-extralight tracking-tight text-center max-w-2xl leading-tight">
            {currentQuestion?.question || t("interaction.waiting")}
          </h3>
        </div>

        {/* Récap confirmation top2 / bottom2 */}
        {sessionState === "awaiting_confirmation" && confirmationData ? (
          <AnswerConfirmation
            top2={confirmationData.top_2}
            bottom2={confirmationData.bottom_2}
          />
        ) : sessionState === "asking_intensity" ? (
          <IntensitySelector />
        ) : sessionState === "asking_perfume_name" ? (
          <PerfumeNameForm />
        ) : (
          <ChoiceGrid choices={currentQuestion?.choices || []} />
        )}

        {/* Barre de contrôle */}
        <div className="flex justify-center shrink-0 py-3">
          {sessionData && <BottomBar />}
        </div>
      </main>

      <div className="absolute top-0 right-0 -z-10 w-[40%] h-full opacity-[0.03] pointer-events-none bg-gradient-to-l from-primary to-transparent" />
      <div className="absolute bottom-0 left-0 -z-10 w-[40%] h-[60%] opacity-[0.05] pointer-events-none bg-gradient-to-tr from-primary to-transparent blur-[120px]" />
    </div>
  );
}
