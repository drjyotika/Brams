import type { MetadataRoute } from "next";
import { SITE, PUBLIC_ROUTES } from "../lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const priorities: Record<string, number> = {
    "/":                   1.0,
    "/about":              0.8,
    "/book":               0.9,
    "/contact":            0.7,
    "/privacy-policy":     0.4,
    "/terms":              0.4,
    "/confidentiality":    0.4,
    "/emergency-contact":  0.5,
  };

  const changeFreq: Record<string, MetadataRoute.Sitemap[number]["changeFrequency"]> = {
    "/":                   "weekly",
    "/about":              "monthly",
    "/book":               "weekly",
    "/contact":            "monthly",
    "/privacy-policy":     "yearly",
    "/terms":              "yearly",
    "/confidentiality":    "yearly",
    "/emergency-contact":  "yearly",
  };

  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE.url}${route === "/" ? "" : route}`,
    lastModified,
    changeFrequency: changeFreq[route] ?? "monthly",
    priority:        priorities[route] ?? 0.5,
  }));
}
