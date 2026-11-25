"use client";

import MaterialIcon from "@/components/ui/MaterialIcon";
import { useState } from "react";
import { useTranslation } from "@/i18n/LanguageContext";
import { activeBrand } from "@/lib/brand";

const techPartners = [
  { icon: "auto_awesome", name: "Mistral" },
  { icon: "cloud_queue", name: "AWS" },
  { icon: "psychology", name: "OpenAI" },
  { icon: "search", name: "Google" },
];

export default function TechBar() {
  const { t } = useTranslation();
  // Logo partenaire de la marque (Help : Les Français avancent) — masqué tant que l'image
  // n'est pas déposée dans public/, plutôt qu'une icône d'image cassée.
  const partnerLogo = activeBrand.partnerLogo;
  const [partnerLogoMissing, setPartnerLogoMissing] = useState(false);

  return (
    <section className="tech-bar py-4 px-6 border-y border-primary/5">
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Tech logos */}
        <div className="flex flex-wrap items-center justify-center gap-6">
          {partnerLogo && !partnerLogoMissing && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={partnerLogo.src}
              alt={partnerLogo.alt}
              className="h-8 md:h-10 w-auto object-contain"
              onError={() => setPartnerLogoMissing(true)}
            />
          )}
        <div className="flex flex-wrap justify-center gap-6 opacity-60 grayscale scale-75 md:scale-90">
          {techPartners.map((partner) => (
            <div key={partner.name} className="flex items-center gap-2">
              <MaterialIcon name={partner.icon} className="text-2xl" />
              <span className="font-bold text-lg tracking-tighter">
                {partner.name}
              </span>
            </div>
          ))}
        </div>
        </div>

        {/* Divider */}
        <div className="h-px w-12 bg-primary/20 md:h-8 md:w-px" />

        {/* Rose Assistant card */}
        <div className="flex items-center gap-3 bg-white/40 p-2 px-4 rounded-lg border border-primary/10">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white scale-75">
            <MaterialIcon name="robot_2" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-primary uppercase">
              {t("techBar.roseAssistant")}
            </p>
            <p className="text-xs italic font-medium">
              &ldquo;{t("techBar.roseMessage")}&rdquo;
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
