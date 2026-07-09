/**
 * Single source of truth for SEO-related constants used by metadata,
 * sitemap, robots, manifest, and JSON-LD generators.
 */

export const SITE = {
  url:         "https://bramsmindcare.com",
  name:        "Brams Mind Care",
  brand:       "Brams Mind Care - Dr. Jyotika Kanwar",
  tagline:     "Confidential psychiatric care, online from anywhere in India.",
  description:
    "Evidence-based online psychiatric care by Dr. Jyotika Kanwar, board-certified psychiatrist. Confidential video consultations for anxiety, depression, ADHD, and trauma, available across India.",
  shortDescription:
    "Online psychiatric consultations across India by Dr. Jyotika Kanwar: anxiety, depression, ADHD, trauma.",
  logo:        "/logo.png",
  ogImage:     "/og.png",
  locale:      "en_IN",
  language:    "en",
  themeColor:  "#745475",
  email:       "support@bramsmindcare.com",
  drEmail:     "drjyotika@bramsmindcare.com",
  founded:     "2024",
  country:     "IN",
  countryName: "India",
} as const;

export const DOCTOR = {
  name:        "Dr. Jyotika Kanwar",
  givenName:   "Jyotika",
  familyName:  "Kanwar",
  honorificPrefix: "Dr.",
  jobTitle:    "Consultant Psychiatrist",
  specialty:   "Psychiatry",
  image:       "/hero.png",
  description:
    "Board-certified consultant psychiatrist offering confidential, evidence-based online care for anxiety, depression, ADHD, trauma, and related mental health conditions across India.",
} as const;

/**
 * Profiles that corroborate the brand's identity, emitted as schema.org
 * `sameAs`. A strong entity signal for SEO / AEO / GEO — the more
 * authoritative profiles listed, the more confidently answer engines treat
 * Brams Mind Care as a real, verified entity.
 *
 * Add Instagram / Facebook / Practo / LinkedIn / YouTube URLs here as they go
 * live — one line each, no other code changes needed.
 */
export const SOCIAL_PROFILES: string[] = [
  "https://share.google/hqdWQYI1x3T3WjKht", // Google Business Profile
  "https://www.linkedin.com/in/dr-jyotika-kanwar-93b33417a", // LinkedIn
];

/** Routes that should be indexed by search engines. */
export const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/book",
  "/contact",
  "/privacy-policy",
  "/terms",
  "/confidentiality",
  "/emergency-contact",
] as const;

/** Routes that should NEVER be indexed (auth, ephemeral, transactional). */
export const NOINDEX_PATTERNS = [
  "/patient",
  "/patient/*",
  "/admin",
  "/admin/*",
  "/api/*",
  "/book/success",
  "/book/failed",
] as const;
