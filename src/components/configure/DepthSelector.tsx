"use client";

import { useEffect, useState } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { useTranslation } from "@/i18n/LanguageContext";
import { activeBrand } from "@/lib/brand";

interface DepthSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function DepthSelector({ value, onChange }: DepthSelectorProps) {
  const { t } = useTranslation();
  const [showInfo, setShowInfo] = useState(false);
  const fixed = activeBrand.fixedQuestionCount;

  const depths = fixed
    ? [{ value: fixed, label: fixed }]
    : [
        { value: "1", label: "1" },
        { value: "4", label: "4" },
        { value: "12", label: "12" },
      ];

  useEffect(() => {
    if (fixed && value !== fixed) {
      onChange(fixed);
    }
  }, [fixed, value, onChange]);

  return (
    <section className="relative">
      <h3 className="text-surface text-xs font-bold uppercase tracking-widest leading-tight mb-1.5 [@media(max-height:620px)]:mb-1 flex items-center gap-2">
        <MaterialIcon name="query_stats" className="text-sm" />
        {t("configure.questionCountTitle")}&nbsp;<button
          type="button"
          aria-label={t("configure.depthAriaLabel")}
          onClick={() => setShowInfo((v) => !v)}
          onMouseEnter={() => setShowInfo(true)}
          onMouseLeave={() => setShowInfo(false)}
          className="text-surface transition-colors"
        >
          <MaterialIcon name="info" className="text-[14px]" />
        </button>
      </h3>

      {/* Tooltip */}
      {showInfo && (
        <div className="absolute z-20 top-6 right-0 w-60 brand-surface border border-primary/15 rounded-lg shadow-lg p-3 text-[11px] text-primary/80 leading-relaxed">
          <div className="absolute -top-1.5 right-2 w-2.5 h-2.5 brand-surface border-l border-t border-primary/15 rotate-45" />
          {t("configure.depthInfo")}
        </div>
      )}

      <div className={`grid gap-2 ${fixed ? "grid-cols-1" : "grid-cols-3"}`}>
        {depths.map((depth) => (
          <label key={depth.value} className="group relative cursor-pointer">
            <input
              type="radio"
              name="questions"
              value={depth.value}
              checked={value === depth.value}
              onChange={() => onChange(depth.value)}
              className="peer hidden"
            />
            <div className="flex flex-col items-center justify-center gap-1 py-2 [@media(max-height:620px)]:py-1.5 rounded-lg border-2 border-primary/10 brand-surface-soft text-primary/60 transition-all group-hover:bg-primary/5 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-lg">
              <span className="text-sm font-bold">{depth.label}</span>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}
