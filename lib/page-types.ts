// Page content types — no server-side imports, safe for client components.

// ─── Content shapes ────────────────────────────────────────────────────────────

export type LegalSection = {
  id: string;
  heading: string;
  body: string;
};

export type LegalContent = {
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
};

export type EmergencyContactItem = {
  id: string;
  name: string;
  role: string;
  phone: string;
  available: string;
  note: string;
};

export type EmergencyContent = {
  subtitle: string;
  emergencyNote: string;
  contacts: EmergencyContactItem[];
};

export type ContactInfoContent = {
  subtitle: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
};

export type PageContent =
  | { kind: "legal";        data: LegalContent        }
  | { kind: "emergency";    data: EmergencyContent     }
  | { kind: "contact-info"; data: ContactInfoContent   };

// ─── Slug → kind ───────────────────────────────────────────────────────────────

export const PAGE_KIND: Record<string, PageContent["kind"]> = {
  "privacy-policy":    "legal",
  "confidentiality":   "legal",
  "terms":             "legal",
  "emergency-contact": "emergency",
  "contact":           "contact-info",
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: Record<string, PageContent> = {
  "privacy-policy": {
    kind: "legal",
    data: {
      lastUpdated: "May 2024",
      intro:
        "Your privacy is important to us. This policy explains how we collect, use, and protect your information.",
      sections: [
        {
          id: "s1",
          heading: "Information We Collect",
          body: "We collect information you provide when booking appointments, filling forms, or contacting us.",
        },
        {
          id: "s2",
          heading: "How We Use Your Information",
          body: "We use your information to provide psychiatric care, communicate about appointments, and improve our services.",
        },
        {
          id: "s3",
          heading: "Data Security",
          body: "We implement appropriate security measures to protect your personal information from unauthorised access.",
        },
      ],
    },
  },
  "confidentiality": {
    kind: "legal",
    data: {
      lastUpdated: "May 2024",
      intro:
        "All information shared during sessions is kept strictly confidential in accordance with professional and legal standards.",
      sections: [
        {
          id: "s1",
          heading: "Confidentiality Commitment",
          body: "Everything you share with Dr. Kanwar remains private. We do not disclose your information without your explicit consent.",
        },
        {
          id: "s2",
          heading: "Exceptions",
          body: "Confidentiality may be broken only when required by law or when there is an imminent risk of harm to yourself or others.",
        },
      ],
    },
  },
  "terms": {
    kind: "legal",
    data: {
      lastUpdated: "May 2024",
      intro: "Please read these terms carefully before using our services.",
      sections: [
        {
          id: "s1",
          heading: "Appointments",
          body: "Sessions must be cancelled at least 24 hours in advance. Late cancellations or no-shows may be charged.",
        },
        {
          id: "s2",
          heading: "Fees & Payment",
          body: "Fees are due at the time of service. We accept online payments through our booking portal.",
        },
        {
          id: "s3",
          heading: "Scope of Services",
          body: "Our services are for general psychiatric care. In an emergency, please contact emergency services immediately.",
        },
      ],
    },
  },
  "emergency-contact": {
    kind: "emergency",
    data: {
      subtitle: "If you are in immediate danger, call emergency services (112) right away.",
      emergencyNote:
        "This page is for mental health crisis resources. For life-threatening emergencies, call 112.",
      contacts: [
        {
          id: "c1",
          name: "iCall",
          role: "Psychological counselling",
          phone: "9152987821",
          available: "Mon–Sat, 8am–10pm",
          note: "Free and confidential counselling helpline.",
        },
        {
          id: "c2",
          name: "Vandrevala Foundation",
          role: "Mental health helpline",
          phone: "1860-2662-345",
          available: "24/7",
          note: "Free mental health support and crisis intervention.",
        },
      ],
    },
  },
  "contact": {
    kind: "contact-info",
    data: {
      subtitle: "We're here to help. Reach out to schedule a consultation or ask any questions.",
      address: "",
      phone: "",
      email: "info@bramsmindcare.com",
      hours: "Mon–Sat, 10am–7pm",
    },
  },
};

export function getDefaultContent(slug: string): PageContent {
  return (
    DEFAULTS[slug] ?? {
      kind: "legal",
      data: { lastUpdated: "", intro: "", sections: [] },
    }
  );
}

export function parsePageContent(slug: string, raw: string): PageContent {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.kind && parsed.data) return parsed as PageContent;
  } catch {
    // fall through
  }
  return getDefaultContent(slug);
}
