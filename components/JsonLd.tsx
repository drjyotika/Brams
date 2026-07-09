import { SITE, DOCTOR, SOCIAL_PROFILES } from "../lib/seo";
import type { FaqData } from "../lib/faq";
import { faqAnchorId } from "../lib/faq";
import type { AboutData } from "../lib/about";

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
    sameAs: SOCIAL_PROFILES,
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

export function FaqLd({ faq }: { faq: FaqData }) {
  if (!faq?.items?.length) return null;
  const data = {
    "@context": "https://schema.org",
    "@type":    "FAQPage",
    "@id":      `${SITE.url}/#faq`,
    inLanguage: SITE.language,
    isPartOf:   { "@id": `${SITE.url}/#website` },
    about:      { "@id": `${SITE.url}/#physician` },
    // Built from the same admin-editable source as the visible FAQ section so
    // the structured data always matches the on-page text. Each Question's
    // `url` points at its visible anchor so answer engines can deep-link.
    mainEntity: faq.items.map((item) => ({
      "@type": "Question",
      name:    item.question,
      url:     `${SITE.url}/#${faqAnchorId(item.question)}`,
      acceptedAnswer: {
        "@type": "Answer",
        text:    item.answer,
      },
    })),
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

// ─── About / ProfilePage (enriches the Physician entity for E-E-A-T) ─────────

export function AboutLd({ about }: { about: AboutData }) {
  const physician: AnyObject = {
    "@type":          "Physician",
    "@id":            `${SITE.url}/#physician`,
    name:             about.name,
    jobTitle:         about.role,
    image:            `${SITE.url}${about.photo}`,
    url:              `${SITE.url}/about`,
    medicalSpecialty: "Psychiatry",
    worksFor:         { "@id": `${SITE.url}/#organization` },
    description:      about.intro,
    knowsAbout:       about.specialties,
  };

  if (about.qualifications.length) {
    physician.hasCredential = about.qualifications.map((q) => ({
      "@type":            "EducationalOccupationalCredential",
      credentialCategory: "degree",
      name:               q.label,
    }));
  }
  if (about.memberships.length) {
    physician.memberOf = about.memberships.map((m) => ({ "@type": "Organization", name: m }));
  }
  if (about.languages.length) physician.knowsLanguage = about.languages;
  if (about.registrationNumber) {
    physician.identifier = {
      "@type":     "PropertyValue",
      propertyID:  about.registrationCouncil || "Medical registration",
      value:       about.registrationNumber,
    };
  }

  const data = {
    "@context":  "https://schema.org",
    "@type":     "ProfilePage",
    "@id":       `${SITE.url}/about#profilepage`,
    url:         `${SITE.url}/about`,
    name:        `About ${about.name}`,
    inLanguage:  SITE.language,
    isPartOf:    { "@id": `${SITE.url}/#website` },
    about:       { "@id": `${SITE.url}/#physician` },
    mainEntity:  physician,
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
