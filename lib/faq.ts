/**
 * FAQ content model + defaults.
 *
 * The FAQ is admin-editable (part of SiteContent → `faq`). It is rendered BOTH
 * as visible content (components/FaqSection) and as FAQPage JSON-LD
 * (components/JsonLd → FaqLd) from the SAME data, so the structured data always
 * matches the on-page text — a requirement for Google FAQ eligibility and a
 * strong AEO/GEO signal.
 */
export type FaqItem = { id: string; question: string; answer: string };

export type FaqData = {
  title: string;
  description: string;
  items: FaqItem[];
};

/**
 * Stable, human-readable anchor id for a question (e.g. "faq-how-much-does-an").
 * Used as the DOM id of the visible item AND the `url` fragment on the schema
 * Question, so answer engines can deep-link straight to a specific answer.
 */
export function faqAnchorId(question: string): string {
  const slug = question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return `faq-${slug}`;
}

export const DEFAULT_FAQ: FaqData = {
  title: "Frequently asked questions",
  description:
    "Everything you need to know about online psychiatric care with Dr. Jyotika Kanwar.",
  items: [
    {
      id: "f-conditions",
      question: "What kind of mental health conditions does Dr. Jyotika Kanwar treat?",
      answer:
        "Dr. Jyotika Kanwar is a consultant psychiatrist specializing in anxiety and panic disorders, depression, adult ADHD, and trauma recovery. She provides evidence-based care including psychotherapy guidance and medication management when clinically appropriate.",
    },
    {
      id: "f-how-it-works",
      question: "How do online psychiatric consultations work?",
      answer:
        "Online consultations happen via a secure, encrypted video link. After booking your appointment and completing the payment, you receive the meeting link by email and WhatsApp. Sessions are typically 20–60 minutes depending on whether it's a follow-up or initial consultation.",
    },
    {
      id: "f-confidential",
      question: "Is online psychiatric care confidential?",
      answer:
        "Yes. All consultations are conducted over a HIPAA-aligned encrypted platform. Patient records, reports, and conversations are confidential and accessible only to you and Dr. Jyotika. We never share information with third parties without your explicit consent.",
    },
    {
      id: "f-cost",
      question: "How much does an online psychiatric consultation cost?",
      answer:
        "Brams Mind Care offers three plans: Follow-up at ₹1,000 (20–30 min), Initial Consultation at ₹2,000 (45–60 min) for new patients, and Priority Plus at ₹3,000 for urgent same-day support with an extended 90-minute session.",
    },
    {
      id: "f-coverage",
      question: "Do you serve patients outside major cities?",
      answer:
        "Yes. Brams Mind Care is an online-only practice, serving patients across India. As long as you have a stable internet connection and a private space, you can book a consultation from anywhere in the country.",
    },
    {
      id: "f-emergency",
      question: "What should I do in a mental health emergency?",
      answer:
        "If you are in immediate danger or experiencing a crisis, please call your local emergency services or India's iCall helpline at +91-9152987821. Brams Mind Care is not an emergency service. For urgent but non-crisis support, our Priority Plus plan offers same-day appointment availability.",
    },
    {
      id: "f-prescription",
      question: "Can I get a prescription through online consultation?",
      answer:
        "Yes. Where clinically appropriate, Dr. Jyotika can issue digital prescriptions following telemedicine guidelines. Prescriptions are uploaded to your secure patient dashboard and can also be sent to a pharmacy of your choice.",
    },
  ],
};
