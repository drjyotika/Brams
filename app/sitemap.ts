import type { MetadataRoute } from "next";
import { SITE, PUBLIC_ROUTES } from "../lib/seo";
import { getSiteContent } from "../lib/api";
import { listPublishedSlugs } from "../lib/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const priorities: Record<string, number> = {
    "/":                   1.0,
    "/about":              0.8,
    "/book":               0.9,
    "/blog":               0.7,
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
    "/blog":               "weekly",
    "/contact":            "monthly",
    "/privacy-policy":     "yearly",
    "/terms":              "yearly",
    "/confidentiality":    "yearly",
    "/emergency-contact":  "yearly",
  };

  const staticEntries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => ({
    url: `${SITE.url}${route === "/" ? "" : route}`,
    lastModified,
    changeFrequency: changeFreq[route] ?? "monthly",
    priority:        priorities[route] ?? 0.5,
  }));

  // Admin-editable condition landing pages.
  let conditionEntries: MetadataRoute.Sitemap = [];
  try {
    const content = await getSiteContent();
    conditionEntries = content.conditions.items.map((c) => ({
      url:             `${SITE.url}/conditions/${c.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority:        0.8,
    }));
  } catch {
    /* fall back to static entries only */
  }

  // Published blog posts.
  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const slugs = await listPublishedSlugs();
    blogEntries = slugs.map((p) => ({
      url:             `${SITE.url}/blog/${p.slug}`,
      lastModified:    new Date(p.updated_at),
      changeFrequency: "monthly" as const,
      priority:        0.6,
    }));
  } catch {
    /* blog table may not exist yet / DB unreachable at build time */
  }

  return [...staticEntries, ...conditionEntries, ...blogEntries];
}
