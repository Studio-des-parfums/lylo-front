/** Marques ayant un thème (logo, couleurs) codé dans le front. */
export type ThemeId = "lylo" | "ester" | "help";

export interface BrandConfig {
  /** Identifiant de la marque côté back (questionnaires, sessions) — n'importe quel slug créé dans le dashboard. */
  id: string;
  /** Thème visuel appliqué (data-brand) : celui de la marque s'il existe, sinon Lylo. */
  theme: ThemeId;
  name: string;
  logo: string;
  navLogoSize: number;
  heroBackground: string;
  /** Nombre de questions imposé (un seul choix affiché dans la configuration). */
  fixedQuestionCount?: string;
  /** Logo partenaire propre à la marque, affiché dans la barre des partenaires (TechBar). */
  partnerLogo?: { src: string; alt: string };
}

const brands: Record<ThemeId, Omit<BrandConfig, "id">> = {
  lylo: {
    theme: "lylo",
    name: "Lylo",
    logo: "/logo-sdp.png",
    navLogoSize: 40,
    heroBackground: "/background-lylo.png",
  },
  ester: {
    theme: "ester",
    name: "Lylo",
    logo: "/logo-ester.png",
    navLogoSize: 64,
    heroBackground: "/background-ester.png",
    fixedQuestionCount: "4",
  },
  help: {
    theme: "help",
    name: "H.E.L.P",
    logo: "/logo-help.png",
    navLogoSize: 120, // logo horizontal (4:1)
    heroBackground: "/background-lylo.png",
    fixedQuestionCount: "4",
    partnerLogo: { src: "/logo-les-francais-avancent.png", alt: "Les Français avancent" },
  },
};

function resolveBrand(): BrandConfig {
  const id = process.env.NEXT_PUBLIC_BRAND?.trim().toLowerCase() || "lylo";
  const theme = (id in brands ? id : "lylo") as ThemeId;
  return { ...brands[theme], id };
}

export const activeBrand: BrandConfig = resolveBrand();

if (typeof window !== "undefined") {
  console.log(
    `%c[BRAND] NEXT_PUBLIC_BRAND="${process.env.NEXT_PUBLIC_BRAND}" → activeBrand="${activeBrand.id}" (thème ${activeBrand.theme})`,
    "background:#222;color:#fff;padding:4px 8px;border-radius:4px;font-weight:bold;"
  );
}
