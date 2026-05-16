import { SITE, DOCTOR } from "../lib/seo";

/**
 * Server component that renders JSON-LD structured data.
 *
 * AEO/GEO note: this is what answer engines (ChatGPT, Perplexity, Google
 * Overviews, voice assistants) primarily ingest to understand a site's
 * authority, services, and FAQs. Keep it factual, concrete, and current.
 */

type AnyObject = Record<string, unknown>;

function Script({ data }: { data: AnyObject }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ─── Organization (top-level brand) ───────────────────────────────────────────

export function OrganizationLd() {
  const data = {
    "@context": "https://schema.org",
    "@type":    "MedicalOrganization",
    "@id":      `${SITE.url}/#organization`,
    name:       SITE.name,
    url:        SITE.url,
    logo:       `${SITE.url}${SITE.logo}`,
    image:      `${SITE.url}${SITE.ogImage}`,
    description: SITE.description,
    email:       SITE.email,
    foundingDate: SITE.founded,
    medicalSpecialty: "Psychiatry",
    areaServed: {
      "@type": "Country",
      name:    SITE.countryName,
    },
    availableService: [
      "Online Psychiatric Consultation",
      "Anxiety & Panic Disorder Treatment",
      "Depression Treatment",
      "Adult ADHD Evaluation & Management",
      "Trauma Therapy",
      "Medication Management",
    ],
    sameAs: [] as string[], // populate with social profiles when available
  };
  return <Script data={data} />;
}

// ─── Physician (Dr. Jyotika) ──────────────────────────────────────────────────

export function PhysicianLd() {
  const data = {
    "@context": "https://schema.org",
    "@type":    "Physician",
    "@id":      `${SITE.url}/#physician`,
    name:       DOCTOR.name,
    givenName:  DOCTOR.givenName,
    familyName: DOCTOR.familyName,
    honorificPrefix: DOCTOR.honorificPrefix,
    jobTitle:        DOCTOR.jobTitle,
    image:       `${SITE.url}${DOCTOR.image}`,
    url:         SITE.url,
    email:       SITE.drEmail,
    description: DOCTOR.description,
    medicalSpecialty: DOCTOR.specialty,
    worksFor: { "@id": `${SITE.url}/#organization` },
    areaServed: {
      "@type": "Country",
      name:    SITE.countryName,
    },
    availableService: [
      {
        "@type": "MedicalTherapy",
        name:    "Anxiety & Panic Disorder Treatment",
        description:
          "Evidence-based approaches including CBT and medication management to help patients regain control over overwhelming stress and panic.",
      },
      {
        "@type": "MedicalTherapy",
        name:    "Depression Treatment",
        description:
          "Compassionate, clinical-grade care for mood disorders combining psychotherapy guidance with medication oversight when appropriate.",
      },
      {
        "@type": "MedicalTherapy",
        name:    "Adult ADHD Evaluation & Management",
        description:
          "Comprehensive diagnostic evaluation and ongoing management for adults navigating executive function challenges.",
      },
      {
        "@type": "MedicalTherapy",
        name:    "Trauma Recovery",
        description:
          "Specialized therapeutic interventions for processing past experiences in a safe, secure online environment.",
      },
    ],
  };
  return <Script data={data} />;
}

// ─── Website (with sitelinks SearchAction) ────────────────────────────────────

export function WebsiteLd() {
  const data = {
    "@context": "https://schema.org",
    "@type":    "WebSite",
    "@id":      `${SITE.url}/#website`,
    name:       SITE.name,
    url:        SITE.url,
    description: SITE.description,
    inLanguage:  SITE.language,
    publisher:   { "@id": `${SITE.url}/#organization` },
  };
  return <Script data={data} />;
}

// ─── FAQ (AEO gold standard) ──────────────────────────────────────────────────

export function FaqLd() {
  const data = {
    "@context": "https://schema.org",
    "@type":    "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name:    "What kind of mental health conditions does Dr. Jyotika Kanwar treat?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Dr. Jyotika Kanwar is a consultant psychiatrist specializing in anxiety and panic disorders, depression, adult ADHD, and trauma recovery. She provides evidence-based care including psychotherapy guidance and medication management when clinically appropriate.",
        },
      },
      {
        "@type": "Question",
        name:    "How do online psychiatric consultations work?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Online consultations happen via a secure, encrypted video link. After booking your appointment and completing the payment, you receive the meeting link by email and WhatsApp. Sessions are typically 20–60 minutes depending on whether it's a follow-up or initial consultation.",
        },
      },
      {
        "@type": "Question",
        name:    "Is online psychiatric care confidential?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes. All consultations are conducted over a HIPAA-aligned encrypted platform. Patient records, reports, and conversations are confidential and accessible only to you and Dr. Jyotika. We never share information with third parties without your explicit consent.",
        },
      },
      {
        "@type": "Question",
        name:    "How much does an online psychiatric consultation cost?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Brams Mind Care offers three plans: Follow-up at ₹1,000 (20–30 min), Initial Consultation at ₹2,000 (45–60 min) for new patients, and Priority Plus at ₹3,000 for urgent same-day support with an extended 90-minute session.",
        },
      },
      {
        "@type": "Question",
        name:    "Do you serve patients outside major cities?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes. Brams Mind Care is an online-only practice, serving patients across India. As long as you have a stable internet connection and a private space, you can book a consultation from anywhere in the country.",
        },
      },
      {
        "@type": "Question",
        name:    "What should I do in a mental health emergency?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "If you are in immediate danger or experiencing a crisis, please call your local emergency services or India's iCall helpline at +91-9152987821. Brams Mind Care is not an emergency service. For urgent but non-crisis support, our Priority Plus plan offers same-day appointment availability.",
        },
      },
      {
        "@type": "Question",
        name:    "Can I get a prescription through online consultation?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes. Where clinically appropriate, Dr. Jyotika can issue digital prescriptions following telemedicine guidelines. Prescriptions are uploaded to your secure patient dashboard and can also be sent to a pharmacy of your choice.",
        },
      },
    ],
  };
  return <Script data={data} />;
}

// ─── Service/Offer for each consultation plan ────────────────────────────────

export function ConsultationOffersLd() {
  const offers = [
    {
      name: "Follow-up Consultation",
      description: "Medication management and progress assessment for returning patients. 20–30 minute online session.",
      price: "1000",
      duration: "PT30M",
    },
    {
      name: "Initial Consultation",
      description: "Comprehensive 45–60 minute online evaluation including diagnostic assessment, personalized treatment plan, laboratory review, and family history analysis.",
      price: "2000",
      duration: "PT60M",
    },
    {
      name: "Priority Plus Consultation",
      description: "Extended 90-minute urgent online session with guaranteed 24-hour booking and prioritized portal messaging.",
      price: "3000",
      duration: "PT90M",
    },
  ];

  const data = {
    "@context": "https://schema.org",
    "@type":    "OfferCatalog",
    name:       "Online Psychiatric Consultation Plans",
    provider:   { "@id": `${SITE.url}/#physician` },
    itemListElement: offers.map((o, i) => ({
      "@type": "Offer",
      position: i + 1,
      priceCurrency: "INR",
      price: o.price,
      availability: "https://schema.org/InStock",
      itemOffered: {
        "@type": "MedicalProcedure",
        name:    o.name,
        description: o.description,
        procedureType: "https://schema.org/TherapeuticProcedure",
      },
    })),
  };
  return <Script data={data} />;
}

// ─── Breadcrumbs ──────────────────────────────────────────────────────────────

export function BreadcrumbsLd({ items }: { items: { name: string; url: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type":    "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name:     it.name,
      item:     it.url.startsWith("http") ? it.url : `${SITE.url}${it.url}`,
    })),
  };
  return <Script data={data} />;
}
