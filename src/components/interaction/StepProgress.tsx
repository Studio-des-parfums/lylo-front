"use client";

import { useTranslation } from "@/i18n/LanguageContext";
import { activeBrand } from "@/lib/brand";

const isEster = activeBrand.id === "ester";

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
}

export default function StepProgress({ currentStep, totalSteps }: StepProgressProps) {
  const { t } = useTranslation();
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="flex flex-col items-center gap-2">
      <span className={`text-primary text-[10px] font-bold tracking-[0.4em] uppercase ${isEster ? "" : "opacity-100"}`}>
        {t("interaction.step")} {String(currentStep).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
      </span>
      <div className="w-32 h-[1px] bg-primary/20">
        <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
