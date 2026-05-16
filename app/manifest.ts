import type { MetadataRoute } from "next";
import { SITE } from "../lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:        SITE.brand,
    short_name:  "Brams",
    description: SITE.description,
    start_url:   "/",
    display:     "standalone",
    background_color: "#f9f9fb",
    theme_color:      SITE.themeColor,
    lang:        SITE.language,
    categories:  ["medical", "health", "lifestyle"],
    icons: [
      { src: "/logo.png", sizes: "any", type: "image/png" },
    ],
  };
}
