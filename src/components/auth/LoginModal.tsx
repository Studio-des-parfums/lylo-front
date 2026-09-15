"use client";

import { useEffect, useState } from "react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/i18n/LanguageContext";
import MaterialIcon from "@/components/ui/MaterialIcon";

function decodeJwt(token: string): Record<string, unknown> {
  const payload = token.split(".")[1];
  const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(decoded);
}

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const { login, isLoading, error, clearError } = useAuth();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailFormError, setEmailFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      clearError();
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) return;
    const decoded = decodeJwt(response.credential);
    const googleEmail = decoded.email as string;
    const success = await login(googleEmail);
    if (success) handleClose();
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setEmailFormError(t("auth.invalidEmail"));
      return;
    }
    setEmailFormError(null);
    clearError();
    const success = await login(email.trim());
    if (success) handleClose();
  };

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 backdrop-blur-md" />

      {/* Card */}
      <div
        className={`relative w-full max-w-sm rounded-2xl p-8 shadow-2xl border border-primary/10 bg-[#fdfaf7] transition-all duration-300 ${
          visible ? "scale-100 translate-y-0" : "scale-95 translate-y-6"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-5">
            <span className="h-px w-10 bg-primary/30" />
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MaterialIcon name="person" className="text-primary text-xl" />
            </div>
            <span className="h-px w-10 bg-primary/30" />
          </div>
          <h2 className="text-2xl font-bold text-primary font-display tracking-tight mb-2">
            {t("auth.modalTitle")}
          </h2>
          <p className="text-sm text-primary/55 font-medium">
            {t("auth.modalSubtitle")}
          </p>
        </div>

        {/* Google button */}
        <div className="flex flex-col items-center gap-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-primary/60 text-sm font-medium">
              <MaterialIcon name="progress_activity" className="text-base animate-spin" />
              {t("auth.loading")}
            </div>
          ) : error !== "no_sessions" ? (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => { const msg = "Google OAuth onError triggered"; alert(msg); setDebugError(msg); }}
              theme="outline"
              shape="rectangular"
              size="large"
              text="continue_with"
            />
          ) : null}

          {/* Debug error */}
          {debugError && (
            <div className="text-xs text-red-500 bg-red-50 rounded p-2 w-full break-all">
              {debugError}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm font-medium w-full">
              <MaterialIcon name="error" className="text-base shrink-0" />
              <span>
                {error === "unauthorized" ? t("auth.unauthorized") : error === "no_sessions" ? t("auth.noSessions") : t("auth.error")}
              </span>
            </div>
          )}
        </div>

        {!isLoading && error !== "no_sessions" && (
          <>
            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <span className="flex-1 h-px bg-primary/10" />
              <span className="text-xs text-primary/40 font-medium uppercase tracking-wider">
                {t("auth.orDivider")}
              </span>
              <span className="flex-1 h-px bg-primary/10" />
            </div>

            {/* Email-only form */}
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailFormError(null); }}
                placeholder={t("auth.emailPlaceholder")}
                autoComplete="email"
                className="w-full rounded-lg border border-primary/15 bg-white px-4 py-3 text-sm text-primary placeholder:text-primary/35 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {emailFormError && (
                <span className="text-xs text-red-600 font-medium px-1">{emailFormError}</span>
              )}
              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-primary text-white text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors cursor-pointer"
              >
                {t("auth.emailSubmit")}
              </button>
            </form>
          </>
        )}

        {/* Close */}
        <button
          onClick={handleClose}
          className="w-full py-3 text-xs text-primary/45 hover:text-primary font-bold uppercase tracking-[0.2em] transition-colors cursor-pointer"
        >
          {t("auth.close")}
        </button>
      </div>
    </div>
  );
}
