"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { useTranslation } from "@/i18n/LanguageContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90000;

interface MoodboardButtonProps {
  reference?: string | null;
  initialImageUrl?: string | null;
  iconOnly?: boolean;
  className?: string;
}

/**
 * Bouton rond visible dès qu'une reference existe — affiche un spinner tant que le moodboard
 * n'est pas prêt (poll /api/formulas/{reference}/moodboard), puis l'icône image une fois
 * disponible ; le clic ouvre alors une modale avec l'image en grand.
 */
export default function MoodboardButton({ reference, initialImageUrl, iconOnly, className }: MoodboardButtonProps) {
  const { t } = useTranslation();
  const [imageUrl, setImageUrl] = useState<string | null | undefined>(initialImageUrl);
  const [open, setOpen] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setImageUrl(initialImageUrl);
  }, [initialImageUrl, reference]);

  useEffect(() => {
    if (!reference || imageUrl) return;

    const startedAt = Date.now();
    pollingRef.current = setInterval(async () => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/formulas/${reference}/moodboard`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.moodboard_image_url) {
          setImageUrl(data.moodboard_image_url);
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch {
        /* on réessaie au prochain tick */
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [reference, imageUrl]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!reference && !imageUrl) return null;

  const isLoading = !imageUrl;

  return (
    <>
      <button
        onClick={() => !isLoading && setOpen(true)}
        disabled={isLoading}
        title={iconOnly ? (isLoading ? t("moodboard.loading") : t("moodboard.title")) : undefined}
        className={
          (className ??
            "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-primary text-white text-xs sm:text-sm font-semibold shadow-lg shadow-primary/20 hover:brightness-110 transition-all") +
          (isLoading ? " cursor-wait" : "")
        }
      >
        {isLoading ? (
          <span className="size-[18px] rounded-full border-2 border-current/30 border-t-current animate-spin" />
        ) : (
          <MaterialIcon name="image" className="text-[18px]" />
        )}
        {!iconOnly && (isLoading ? t("moodboard.loading") : t("moodboard.title"))}
      </button>

      {open && imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-primary/10 bg-white p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute -top-3 -right-3 flex items-center justify-center size-8 rounded-full bg-white text-primary shadow-lg hover:bg-primary/5 transition-colors"
              aria-label={t("moodboard.close")}
            >
              <MaterialIcon name="close" className="text-[20px]" />
            </button>
            <img
              src={imageUrl}
              alt={t("moodboard.alt")}
              className="w-full h-auto max-h-[80vh] rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
