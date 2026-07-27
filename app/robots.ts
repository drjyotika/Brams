import type { MetadataRoute } from "next";
import { SITE } from "../lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        // Deliberately NOT blocking /api/ — pages like /book fetch their own
        // rendering data (plans, availability, booking config) client-side
        // from these same-origin routes. Disallowing /api/ here blocked
        // Googlebot's own renderer from completing those fetches, which
        // Search Console surfaced as a Soft 404 on /book. robots.txt isn't a
        // security boundary anyway — sensitive routes are protected by real
        // auth (session cookies), not by hiding them from crawlers.
        disallow: [
          "/admin/",
          "/admin",
          "/patient/",
          "/patient",
          "/book/success",
          "/book/failed",
        ],
      },
      // Be explicit about AI/answer-engine crawlers — opt-in by default.
      // Remove these blocks if you DON'T want a given crawler to access your site.
      { userAgent: "GPTBot",         allow: ["/"], disallow: ["/admin/", "/patient/"] },
      { userAgent: "OAI-SearchBot",  allow: ["/"], disallow: ["/admin/", "/patient/"] },
      { userAgent: "ChatGPT-User",   allow: ["/"], disallow: ["/admin/", "/patient/"] },
      { userAgent: "PerplexityBot",  allow: ["/"], disallow: ["/admin/", "/patient/"] },
      { userAgent: "Google-Extended",allow: ["/"], disallow: ["/admin/", "/patient/"] },
      { userAgent: "ClaudeBot",      allow: ["/"], disallow: ["/admin/", "/patient/"] },
      { userAgent: "anthropic-ai",   allow: ["/"], disallow: ["/admin/", "/patient/"] },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
