"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEV_MODE } from "@/context/SessionContext";
import { useTranslation } from "@/i18n/LanguageContext";

const PAGES = [
  { labelKey: "devNav.home", href: "/" },
  { labelKey: "devNav.config", href: "/configure" },
  { labelKey: "devNav.prep", href: "/preparation" },
  { labelKey: "devNav.interaction", href: "/interaction" },
  { labelKey: "devNav.results", href: "/recommendations" },
  { labelKey: "devNav.formulas", href: "/formulas" },
] as const;

export default function DevNavigator() {
  const pathname = usePathname();
  const { t } = useTranslation();

  if (!DEV_MODE) return null;

  return (
    <div className="fixed top-14 right-4 z-[9999] flex items-center gap-1 bg-black/80 backdrop-blur-sm text-white rounded-full px-3 py-1.5 shadow-xl border border-white/10">
      <span className="text-[9px] font-bold uppercase tracking-widest text-yellow-400 mr-2 shrink-0">
        DEV
      </span>
      {PAGES.map(({ labelKey, href }) => (
        <Link
          key={href}
          href={href}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
            pathname === href
              ? "bg-white/20 text-white"
              : "text-white/60 hover:text-white hover:bg-white/10"
          }`}
        >
          {t(labelKey)}
        </Link>
      ))}
    </div>
  );
}
