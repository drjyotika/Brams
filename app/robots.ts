import type { MetadataRoute } from "next";
import { SITE } from "../lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/",
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
      { userAgent: "GPTBot",         allow: ["/"], disallow: ["/api/", "/admin/", "/patient/"] },
      { userAgent: "OAI-SearchBot",  allow: ["/"], disallow: ["/api/", "/admin/", "/patient/"] },
      { userAgent: "ChatGPT-User",   allow: ["/"], disallow: ["/api/", "/admin/", "/patient/"] },
      { userAgent: "PerplexityBot",  allow: ["/"], disallow: ["/api/", "/admin/", "/patient/"] },
      { userAgent: "Google-Extended",allow: ["/"], disallow: ["/api/", "/admin/", "/patient/"] },
      { userAgent: "ClaudeBot",      allow: ["/"], disallow: ["/api/", "/admin/", "/patient/"] },
      { userAgent: "anthropic-ai",   allow: ["/"], disallow: ["/api/", "/admin/", "/patient/"] },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host:    SITE.url,
  };
}
