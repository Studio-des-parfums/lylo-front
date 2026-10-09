"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export function useBranding() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/branding`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { logo_url: string | null } | null) => {
        if (!cancelled) setLogoUrl(data?.logo_url ?? null);
      })
      .catch(() => {
        if (!cancelled) setLogoUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { logoUrl };
}
