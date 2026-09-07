import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Veřejné routy (bez /admin); pro každou locale + hreflang alternativy.
const ROUTES = ["", "pravidla", "pribeh", "dalsi"] as const;

function url(locale: string, route: string): string {
  return `${BASE}/${locale}${route ? `/${route}` : ""}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const localized = ROUTES.flatMap((route) =>
    routing.locales.map((locale) => ({
      url: url(locale, route),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, url(l, route)]),
        ),
      },
    })),
  );
  // /art — samostatná stránka mimo locale prefix (dvojjazyčná přepínačem).
  return [
    ...localized,
    { url: `${BASE}/art`, changeFrequency: "monthly" as const, priority: 0.6 },
  ];
}
