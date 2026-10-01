"use client";

import { useState } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { useTranslation } from "@/i18n/LanguageContext";

export interface SimilarPerfume {
  brand: string;
  name: string;
  reason: string;
  source_url: string;
}

interface SimilarPerfumesButtonProps {
  /** Résultat déjà en cache pour cette formule (géré par le parent, par ex. par index de
   * formule) — si fourni, aucun fetch n'est déclenché au clic, la bulle s'affiche directement. */
  cached: SimilarPerfume[] | undefined;
  /** Déclenche la recherche côté parent (qui la met en cache) — seulement appelé si `cached`
   * est undefined au moment du clic. */
  onFetch: () => Promise<void>;
  loading: boolean;
  error: boolean;
  className?: string;
}

/**
 * Bouton "?" affiché sur la carte formule : au clic, affiche une bulle avec 2 parfums du
 * commerce ressemblant à la formule. Le résultat est mis en cache par le parent (par formule)
 * pour ne jamais relancer la recherche en revenant sur une formule déjà consultée pendant la
 * session en cours. Un reclic sur le bouton referme la bulle.
 */
export default function SimilarPerfumesButton({ cached, onFetch, loading, error, className }: SimilarPerfumesButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (cached === undefined && !loading) {
      onFetch();
    }
  };

  return (
    <div className="absolute top-2 right-2 z-10">
      <button
        onClick={handleClick}
        title={t("similarPerfumes.button")}
        className={className ?? `flex items-center justify-center size-7 rounded-full border transition-all ${
          open
            ? "bg-primary border-primary text-white"
            : "border-primary/25 bg-white text-primary/70 shadow-sm hover:border-primary hover:text-primary hover:bg-primary/10"
        }`}
      >
        <MaterialIcon name="help" className="text-[16px]" />
      </button>

      {open && (
        <div className="absolute top-9 right-0 w-56 max-w-[70vw] rounded-lg bg-white border border-primary/15 shadow-xl p-3">
          {loading && (
            <div className="flex items-center justify-center gap-2 text-primary/70 text-xs py-2">
              <span className="size-3.5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              {t("similarPerfumes.loading")}
            </div>
          )}

          {!loading && error && (
            <p className="text-xs text-red-500 text-center py-2">{t("similarPerfumes.error")}</p>
          )}

          {!loading && !error && cached && cached.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {cached.map((p) => (
                <li key={`${p.brand}-${p.name}`} className="text-xs text-[#4f443e]">
                  <span className="font-semibold text-primary">{p.name}</span> — {p.brand}
                </li>
              ))}
            </ul>
          )}

          {!loading && !error && cached && cached.length === 0 && (
            <p className="text-xs text-primary/50 text-center py-2">{t("similarPerfumes.error")}</p>
          )}
        </div>
      )}
    </div>
  );
}
