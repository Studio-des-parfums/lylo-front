"use client";

import { useTranslation } from "@/i18n/LanguageContext";
import { activeBrand } from "@/lib/brand";

const isEster = activeBrand.id === "ester";

export interface ChoiceWithImage {
  label: string;
  image?: string;
}

interface AnswerConfirmationProps {
  top2: string[] | ChoiceWithImage[];
  bottom2: string[] | ChoiceWithImage[];
}

function normalize(items: string[] | ChoiceWithImage[]): ChoiceWithImage[] {
  return items.map((item) =>
    typeof item === "string" ? { label: item } : item
  );
}

function ConfirmCard({ item, variant }: { item: ChoiceWithImage; variant: "top" | "bottom" }) {
  const isTop = variant === "top";
  return (
    <div className={`rounded-xl border-2 overflow-hidden ${isTop ? "border-green-300" : "border-red-300"}`}>
      {item.image && (
        <div
          className="w-full h-20 bg-cover bg-center"
          style={{ backgroundImage: `url('${item.image}')` }}
        />
      )}
      <div className={`px-4 py-2.5 text-center ${isTop ? "bg-green-50" : "bg-red-50"}`}>
        <span className={`text-sm tracking-wider uppercase font-medium ${isTop ? "text-green-700" : "text-red-400"}`}>
          {item.label}
        </span>
      </div>
    </div>
  );
}

export default function AnswerConfirmation({ top2, bottom2 }: AnswerConfirmationProps) {
  const { t } = useTranslation();
  const top = normalize(top2);
  const bottom = normalize(bottom2);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 px-2">
      <p className={`text-center text-sm tracking-widest uppercase font-medium ${isEster ? "text-primary" : "text-primary/100"}`}>
        {t("confirmation.subtitle")}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          <span className={`text-xs tracking-widest uppercase font-semibold text-center ${isEster ? "text-primary" : "text-primary/40"}`}>
            {t("confirmation.preferred")}
          </span>
          <div className="flex flex-col gap-2">
            {top.map((item) => (
              <ConfirmCard key={item.label} item={item} variant="top" />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xs tracking-widest uppercase text-stone-400 font-semibold text-center">
            {t("confirmation.leastFavored")}
          </span>
          <div className="flex flex-col gap-2">
            {bottom.map((item) => (
              <ConfirmCard key={item.label} item={item} variant="bottom" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
