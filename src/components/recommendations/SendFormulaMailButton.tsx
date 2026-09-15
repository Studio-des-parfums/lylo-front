"use client";

import { useState } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { useTranslation } from "@/i18n/LanguageContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface SendFormulaMailButtonProps {
  /** Référence de la formule sauvegardée en base (retournée par /formulas/save ou /save-multi). */
  reference: string;
  className?: string;
  /** Icône seule, sans le libellé — pour les emplacements compacts (ex: une carte par participant). */
  iconOnly?: boolean;
}

/**
 * Bouton "Recevoir par mail" + modal (prénom/nom/email) — remplace l'ancien envoi
 * automatique (déclenché à l'oral ou via la config) : l'utilisateur choisit explicitement
 * quand et à quelle adresse recevoir sa formule, à l'écran de résultats, à côté du QR code
 * et du bouton imprimer. Appelle POST /formulas/{reference}/send-mail, qui persiste aussi
 * le prénom/nom sur la formule en base.
 */
export default function SendFormulaMailButton({ reference, className, iconOnly }: SendFormulaMailButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch(`${API_BASE}/api/formulas/${reference}/send-mail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
        }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Laisse le temps à l'animation de fermeture avant de réinitialiser le statut,
    // pour ne pas voir le formulaire "sauter" pendant que la modal se ferme.
    setTimeout(() => setStatus("idle"), 200);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={iconOnly ? t("sendMail.button") : undefined}
        className={
          className ??
          "flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-xs sm:text-sm font-semibold shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
        }
      >
        <MaterialIcon name="mail" className={iconOnly ? "text-[16px]" : "text-[18px]"} />
        {!iconOnly && t("sendMail.button")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-primary/10 bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="text-left">
                <h3 className="text-base font-semibold text-primary">{t("sendMail.title")}</h3>
                <p className="mt-1 text-sm text-primary/65">{t("sendMail.subtitle")}</p>
              </div>
              <button
                onClick={handleClose}
                className="text-primary/50 transition-colors hover:text-primary"
                aria-label={t("sendMail.close")}
              >
                <MaterialIcon name="close" className="text-[20px]" />
              </button>
            </div>

            {status === "sent" ? (
              <div className="mt-5 flex flex-col items-center gap-2 py-4 text-green-700">
                <MaterialIcon name="check_circle" className="text-[32px]" />
                <p className="text-sm font-semibold">{t("sendMail.sent")}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t("sendMail.firstName")}
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-primary/15 bg-white text-sm text-primary placeholder:text-primary/35 outline-none focus:border-primary/40"
                  />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={t("sendMail.lastName")}
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-primary/15 bg-white text-sm text-primary placeholder:text-primary/35 outline-none focus:border-primary/40"
                  />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("sendMail.email")}
                  className="w-full px-3 py-2 rounded-lg border border-primary/15 bg-white text-sm text-primary placeholder:text-primary/35 outline-none focus:border-primary/40"
                />
                <button
                  type="submit"
                  disabled={status === "sending" || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-primary text-white text-sm font-semibold shadow-lg shadow-primary/20 hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {status === "sending"
                    ? <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    : <MaterialIcon name="send" className="text-[16px]" />
                  }
                  {status === "sending" ? t("sendMail.sending") : t("sendMail.submit")}
                </button>
                {status === "error" && (
                  <p className="text-xs text-red-500 text-center">{t("sendMail.error")}</p>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
