"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { AppLanguage } from "@/lib/language";
import { buildFormulaShareUrl, ShareableFormula } from "@/lib/shareableFormula";

interface FormulaQrCodeProps {
  formula: ShareableFormula;
  language: AppLanguage;
  buttonLabel: string;
  title: string;
  subtitle: string;
  closeLabel: string;
  className?: string;
  /** Icône seule, sans le libellé — pour les emplacements compacts (bouton rond côte à côte). */
  iconOnly?: boolean;
}

export default function FormulaQrCode({
  formula,
  language,
  buttonLabel,
  title,
  subtitle,
  closeLabel,
  className,
  iconOnly,
}: FormulaQrCodeProps) {
  const [shareUrl, setShareUrl] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setShareUrl(buildFormulaShareUrl(formula, language, window.location.origin));
  }, [formula, language]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!shareUrl) {
    return null;
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(shareUrl)}`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={iconOnly ? buttonLabel : undefined}
        className={
          className ??
          "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-primary text-white text-xs sm:text-sm font-semibold shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
        }
      >
        <MaterialIcon name="qr_code_2" className="text-[18px]" />
        {!iconOnly && buttonLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-primary/10 bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="text-left">
                <h3 className="text-base font-semibold text-primary">{title}</h3>
                <p className="mt-1 text-sm text-primary/65">{subtitle}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-primary/50 transition-colors hover:text-primary"
                aria-label={closeLabel}
              >
                <MaterialIcon name="close" className="text-[20px]" />
              </button>
            </div>

            <div className="mt-4 flex justify-center">
              <img
                src={qrCodeUrl}
                alt={title}
                className="size-60 rounded-xl border border-primary/10 bg-white p-2"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
