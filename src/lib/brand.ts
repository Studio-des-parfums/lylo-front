/** Marques ayant un thème (logo, couleurs) codé dans le front. */
export type ThemeId = "lylo" | "ester";

export interface BrandConfig {
  /** Identifiant de la marque côté back (questionnaires, sessions) — n'importe quel slug créé dans le dashboard. */
  id: string;
  /** Thème visuel appliqué (data-brand) : celui de la marque s'il existe, sinon Lylo. */
  theme: ThemeId;
  name: string;
  logo: string;
  navLogoSize: number;
  heroBackground: string;
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
