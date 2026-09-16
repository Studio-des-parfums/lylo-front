"use client";

import { useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import LanguageSelector from "@/components/ui/LanguageSelector";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { useTranslation } from "@/i18n/LanguageContext";
import MicCalibrator from "@/components/preparation/MicCalibrator";
import { useAuth } from "@/context/AuthContext";
import LoginModal from "@/components/auth/LoginModal";
import { activeBrand } from "@/lib/brand";

const isEster = activeBrand.id === "ester";
const FORMULAS_ACCESS_EMAIL = "it@sdp-paris.com";

interface NavbarProps {
  showActions?: boolean;
  transparent?: boolean;
}

export default function Navbar({ showActions = true, transparent = false }: NavbarProps) {
  const { t } = useTranslation();
  const { user, logout, loginModalOpen, openLoginModal, closeLoginModal } = useAuth();
  const router = useRouter();

  const handleLogoClick = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }, []);

  return (
    <>
      <header className={`fixed top-0 z-50 w-full px-6 lg:px-20 py-2 ${transparent ? "" : "glass-nav border-b border-primary/10"}`}>
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3" onClick={handleLogoClick}>
            <Image src={activeBrand.logo} alt={`Logo ${activeBrand.name}`} width={activeBrand.navLogoSize} height={activeBrand.navLogoSize} style={{ width: "auto", height: "auto" }} />
            <span className="text-primary text-lg font-light">×</span>
            <Image src="/logo-lampions.png" alt="Logo Lampion" width={56} height={56} style={{ width: "auto", height: "auto" }} />
            {isEster && (
              <div className="flex items-center gap-2">
                <span className="text-primary text-xs font-semibold">v1.0</span>
                <span className="text-primary/60 text-[10px] font-medium uppercase tracking-wide">By Lylo AI</span>
              </div>
            )}
          </Link>

          {/* Right side */}
          {showActions && (
            <div className="flex items-center gap-4 sm:gap-8">
              <div className="flex items-center gap-3 sm:gap-6">
                <MicCalibrator />
                {user?.email === FORMULAS_ACCESS_EMAIL && (
                  <button
                    onClick={() => router.push("/formulas")}
                    aria-label="Formulas"
                    title="Formulas"
                    className="flex items-center justify-center size-9 rounded-full text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <MaterialIcon name="science" className="text-[20px]" />
                  </button>
                )}
                <LanguageSelector />
                <div className="flex gap-3 items-center">
                  {user ? (
                    <>
                      <span className="hidden sm:block text-sm text-primary/70 font-medium">
                        {t("auth.welcome")}, {user.first_name}
                      </span>
                      <Button variant="outline" className="hidden sm:flex" onClick={logout}>
                        {t("auth.logout")}
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" className="hidden sm:flex" onClick={openLoginModal}>
                      {t("nav.login")}
                    </Button>
                  )}
                  {user && <Button variant="primary" onClick={() => router.push("/configure")}>{t("nav.getStarted")}</Button>}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <LoginModal open={loginModalOpen} onClose={closeLoginModal} />
    </>
  );
}
