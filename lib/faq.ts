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
        "Dr. Jyotika Kanwar is a consultant psychiatrist who works with anxiety and panic disorders, depression, adult ADHD, and trauma recovery. Her care combines psychotherapy guidance with medication management when it's clinically appropriate.",
    },
    {
      id: "f-how-it-works",
      question: "How do online psychiatric consultations work?",
      answer:
        "You'll connect over a secure, encrypted video link. Once you've booked your slot and completed payment, the meeting link lands in your email and WhatsApp. Sessions run 20–60 minutes depending on whether it's a follow-up or a first consultation.",
    },
    {
      id: "f-confidential",
      question: "Is online psychiatric care confidential?",
      answer:
        "Completely. Every consultation runs on an encrypted, HIPAA-aligned platform, and everything you share, records, notes, conversations, stays between you and Dr. Jyotika. Nothing gets passed on to anyone else without your explicit consent.",
    },
    {
      id: "f-cost",
      question: "How much does an online psychiatric consultation cost?",
      answer:
        "Brams Mind Care runs three plans: Follow-up at ₹1,000 (20–30 min), Initial Consultation at ₹2,000 (45–60 min) for new patients, and Priority Plus at ₹3,000 for urgent same-day support with a longer 90-minute session.",
    },
    {
      id: "f-coverage",
      question: "Do you serve patients outside major cities?",
      answer:
        "That's actually the whole point of being online-only. As long as you've got a stable internet connection and somewhere private to talk, you can book a session from anywhere in India, no matter how far you are from a major city.",
    },
    {
      id: "f-emergency",
      question: "What should I do in a mental health emergency?",
      answer:
        "If you're in immediate danger or in crisis, please call your local emergency services or India's iCall helpline at +91-9152987821 right away. Brams Mind Care isn't set up to handle emergencies, but for urgent non-crisis support, Priority Plus offers same-day appointments.",
    },
    {
      id: "f-prescription",
      question: "Can I get a prescription through online consultation?",
      answer:
        "In many cases, yes. Where it's clinically appropriate, Dr. Jyotika issues a digital prescription straight to your secure patient dashboard, and if you'd rather, it can be sent directly to a pharmacy of your choice.",
    },
  ],
};
