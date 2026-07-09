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
  role: "Consultant Psychiatrist",
  photo: "/hero.png",
  intro:
    "Dr. Jyotika Kanwar is a consultant psychiatrist providing confidential, evidence-based mental health care online to patients across India. She completed her MD in Psychiatry at PGIMER, Chandigarh — one of India's foremost medical institutes — and focuses on anxiety and panic disorders, depression, adult ADHD, and trauma recovery.",
  approach:
    "Her approach pairs careful clinical assessment with compassionate, judgement-free care. Where clinically appropriate, treatment blends psychotherapy guidance with medication management, tailored to each person and reviewed collaboratively over time. Every consultation is conducted over a secure, private video link, so patients can access expert psychiatric care from the comfort and confidentiality of home.",
  qualifications: [
    { id: "q-mbbs", label: "MBBS" },
    { id: "q-md", label: "MD (Psychiatry) — PGIMER, Chandigarh" },
  ],
  specialties: [
    "Anxiety & panic disorders",
    "Depression & mood disorders",
    "Adult ADHD evaluation & management",
    "Trauma recovery",
  ],
  // Fill these in via Admin → Content → About (left blank so nothing unverified
  // is published):
  experienceYears: "",
  registrationNumber: "",
  registrationCouncil: "",
  memberships: [],
  languages: [],
};
