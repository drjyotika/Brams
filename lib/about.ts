/**
 * "About Dr. Jyotika" authority page content (admin-editable).
 *
 * Drives both the visible /about page and its Physician / ProfilePage JSON-LD.
 * This is an E-E-A-T page for medical (YMYL) content, so accuracy matters:
 * fields that only the clinician can confirm (registration number, years of
 * experience, memberships, languages) default to EMPTY and render only when
 * filled in — never fabricate credentials.
 */
export type AboutCredential = { id: string; label: string };

export type AboutData = {
  eyebrow: string;
  name: string;
  role: string;
  photo: string;
  intro: string;
  approach: string;
  qualifications: AboutCredential[];
  specialties: string[];
  /** Optional — render only when set (leave blank until confirmed). */
  experienceYears: string;
  registrationNumber: string;
  registrationCouncil: string;
  memberships: string[];
  languages: string[];
};

export const DEFAULT_ABOUT: AboutData = {
  eyebrow: "ABOUT YOUR PSYCHIATRIST",
  name: "Dr. Jyotika Kanwar",
  role: "Psychiatrist · MD Psychiatry, PGIMER Chandigarh",
  photo: "/hero.png",
  intro:
    "Dr. Jyotika Kanwar is a psychiatrist who completed her MD in Psychiatry at PGIMER, Chandigarh — one of India's premier tertiary-care institutes — with comprehensive clinical training in adult psychiatry across both outpatient (OPD) and inpatient (IPD) settings. Her clinical work spans ICD-11–based diagnostic assessment, psychopharmacology, and evidence-based management of mood disorders, anxiety disorders, psychotic disorders, substance-use disorders, and psychiatric emergencies.",
  approach:
    "Every visit starts with a proper psychiatric evaluation, not a rushed checklist, so Dr. Jyotika actually understands what's going on before deciding on next steps. From there, care is built around you: therapy techniques such as CBT where they help, medication where it's genuinely needed, and regular check-ins to see what's working and what isn't. All of it happens over a private video call, so you get real psychiatric care without ever having to sit in a waiting room.",
  qualifications: [
    { id: "q-md", label: "MD (Psychiatry) — PGIMER, Chandigarh (2025)" },
    { id: "q-mbbs", label: "MBBS — Bharati Vidyapeeth Medical College, Pune (2017)" },
  ],
  specialties: [
    "Anxiety & panic disorders",
    "Depression & mood disorders",
    "Psychotic disorders",
    "Addiction & substance-use disorders",
    "Psychiatric emergencies & suicide-risk assessment",
    "Child & adolescent psychiatry",
  ],
  // Registration shown as a plain statement (no number). Other fields left
  // blank — fill via Admin → Content → About if/when confirmed.
  experienceYears: "",
  registrationNumber: "",
  registrationCouncil: "Delhi Medical Council",
  memberships: [],
  languages: [],
};
