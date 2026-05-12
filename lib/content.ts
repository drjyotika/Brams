// Content types — every section component accepts a typed `data` prop so the
// shapes below double as the contract for the API.

export type NavLink = { label: string; href: string };

export type NavData = {
  brand: string;
  links: NavLink[];
  cta: { label: string; href: string };
};

export type HeroData = {
  eyebrow: string;
  titleLead: string;
  titleAccent: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  portrait: { src: string; alt: string };
  badge: { label: string; quote: string };
};

export type SupportTone =
  | "sky"
  | "lilac"
  | "muted"
  | "dark"
  | "lime"
  | "sand"
  | "mint";
export type SupportCard = {
  id: string;
  title: string;
  description: string;
  iconName: string;
  tone: SupportTone;
  meta?: string;
  cta?: { label: string; href: string };
};

export type SupportData = {
  eyebrow?: string;
  title: string;
  description: string;
  link: { label: string; href: string };
  cards: SupportCard[];
};

export type StepCard = {
  id: string;
  number: string;
  title: string;
  description: string;
  iconName: string;
  iconBg: "lilac" | "sky" | "lime";
};

export type HowItWorksData = {
  title: string;
  description: string;
  steps: StepCard[];
};

export type PricingPlan = {
  id: string;
  eyebrow: string;
  title: string;
  price: string;
  unit: string;
  features: string[];
  cta: { label: string; href: string };
  highlighted?: boolean;
  badge?: string;
};

export type PricingData = {
  title: string;
  toggle: { primary: string; secondary: string };
  plans: PricingPlan[];
};

export type NewsletterData = {
  title: string;
  description: string;
  inputPlaceholder: string;
  buttonLabel: string;
};

export type FooterColumn = { links: NavLink[] };

export type FooterData = {
  brand: string;
  copyright: string;
  columns: FooterColumn[];
};

export type StatusCta = {
  id: string;
  /** Optional emoji prefix shown before the label */
  emoji?: string;
  label: string;
  /** Supports the token {planId} which is replaced at render time on the failed page */
  href: string;
  variant: "primary" | "secondary" | "text";
};

export type BookingSuccessData = {
  title: string;
  subtitle: string;
  ctas: StatusCta[];
  footerNote: string;
  supportEmail: string;
  copyright: string;
};

export type BookingFailedData = {
  title: string;
  body: string;
  ctas: StatusCta[];
  supportEmail: string;
  troubleshootTitle: string;
  troubleshootBody: string;
};

export type SiteContent = {
  nav: NavData;
  hero: HeroData;
  support: SupportData;
  howItWorks: HowItWorksData;
  pricing: PricingData;
  newsletter: NewsletterData;
  footer: FooterData;
  bookingSuccess: BookingSuccessData;
  bookingFailed: BookingFailedData;
};

// Default content — used as fallback when no API data is supplied. Mirrors
// the Figma design exactly.
export const defaultContent: SiteContent = {
  nav: {
    brand: "Brams Mind Care",
    links: [
      { label: "Consultations", href: "#consultations" },
      { label: "Approach", href: "#approach" },
      { label: "About", href: "#about" },
      { label: "FAQ", href: "#faq" },
    ],
    cta: { label: "Book Session", href: "#book" },
  },
  hero: {
    eyebrow: "COMPASSIONATE PSYCHIATRIC CARE",
    titleLead: "Confidential care",
    titleAccent: "from home.",
    description:
      "Experience evidence-based mental health support that prioritizes your peace of mind and professional excellence.",
    primaryCta: { label: "Book Online Consultation", href: "#book" },
    secondaryCta: { label: "Explore Services", href: "#services" },
    portrait: {
      src: "/hero.png",
      alt: "Dr. Jyotika Kanwar, board-certified psychiatrist",
    },
    badge: {
      label: "Board Certified",
      quote:
        "Our mission is to provide a safe, non-judgmental space for your healing journey.",
    },
  },
  support: {
    title: "Specialized Support",
    description:
      "Compassionate care tailored to your unique psychological needs and life circumstances.",
    link: { label: "View all specialties", href: "#specialties" },
    cards: [
      {
        id: "anxiety",
        title: "Anxiety & Panic Disorders",
        description:
          "Evidence-based approaches to manage overwhelming stress and help you regain control of your daily life.",
        iconName: "wind",
        tone: "sky",
      },
      {
        id: "depression",
        title: "Depression",
        description:
          "Navigating the complexities of mood disorders with empathy and clinical precision.",
        iconName: "cloud-rain",
        tone: "lilac",
      },
      {
        id: "adhd",
        title: "ADHD & Focus",
        description:
          "Comprehensive evaluation and management for adults navigating executive function challenges.",
        iconName: "target",
        tone: "muted",
      },
      {
        id: "trauma",
        title: "Trauma Recovery",
        description:
          "Specialized therapeutic interventions for processing past experiences in a gentle, secure environment.",
        iconName: "shield",
        tone: "dark",
      },
    ],
  },
  howItWorks: {
    title: "How it Works",
    description:
      "Your journey to mental wellness is simplified through our structured 3-step digital process.",
    steps: [
      {
        id: "book",
        number: "01",
        title: "Book Your Slot",
        description:
          "Select a time that suits your schedule through our secure HIPAA-compliant portal.",
        iconName: "calendar",
        iconBg: "lilac",
      },
      {
        id: "join",
        number: "02",
        title: "Join Session",
        description:
          "Receive a private video link for your high-definition, encrypted consultation.",
        iconName: "video",
        iconBg: "sky",
      },
      {
        id: "care",
        number: "03",
        title: "Continued Care",
        description:
          "Access your treatment plans and schedule follow-ups through your dashboard.",
        iconName: "heart-pulse",
        iconBg: "lime",
      },
    ],
  },
  pricing: {
    title: "Consultation Plans",
    toggle: { primary: "Self-Pay", secondary: "Insurance" },
    plans: [
      {
        id: "follow-up",
        eyebrow: "RETURNING PATIENTS",
        title: "Follow-up",
        price: "₹1,000",
        unit: "20–30 min",
        features: [
          "Medication Management",
          "Progress Assessment",
          "Pharmacy Coordination",
        ],
        cta: { label: "Book Follow-up", href: "#book-followup" },
      },
      {
        id: "initial",
        eyebrow: "COMPREHENSIVE CARE",
        title: "Initial Consultation",
        price: "₹2,000",
        unit: "45–60 min",
        features: [
          "Full Diagnostic Evaluation",
          "Personalized Treatment Plan",
          "Laboratory Review",
          "Family History Analysis",
        ],
        cta: { label: "Book Discovery", href: "#book-initial" },
        highlighted: true,
        badge: "RECOMMENDED",
      },
      {
        id: "priority",
        eyebrow: "URGENT SUPPORT",
        title: "Priority Plus",
        price: "₹3,000",
        unit: "/ Session",
        features: [
          "Guaranteed 24-hr Booking",
          "Extended 90-min Session",
          "24/7 Portal Message Priority",
        ],
        cta: { label: "Contact for Availability", href: "#book-priority" },
      },
    ],
  },
  newsletter: {
    title: "Start your path to mental wellness today.",
    description:
      "Join our mailing list for weekly insights on mental health or book your first appointment now.",
    inputPlaceholder: "Your email address",
    buttonLabel: "Subscribe",
  },
  footer: {
    brand: "Brams Mind Care",
    copyright: "© 2024 Brams Mind Care. Professional Psychiatric Care.",
    columns: [
      {
        links: [
          { label: "Privacy Policy", href: "#privacy" },
          { label: "Confidentiality Agreement", href: "#confidentiality" },
        ],
      },
      {
        links: [
          { label: "Terms of Service", href: "#terms" },
          { label: "Emergency Contact", href: "#emergency" },
        ],
      },
    ],
  },
  bookingSuccess: {
    title: "Booking Confirmed",
    subtitle:
      "Your consultation has been successfully booked. You will receive the meeting link via email / WhatsApp.",
    ctas: [
      { id: "join",     emoji: "🎥", label: "Join Consultation",  href: "#",  variant: "primary"   },
      { id: "calendar", emoji: "📅", label: "Add to Calendar",    href: "#",  variant: "secondary" },
      { id: "receipt",  emoji: "🧾", label: "Download Receipt",   href: "#",  variant: "secondary" },
      { id: "home",                  label: "← Back to Home",     href: "/",  variant: "text"      },
    ],
    footerNote:
      "If you have any urgent concerns prior to your session, please contact our support desk directly at",
    supportEmail: "support@bramsmindcare.com",
    copyright: "© 2024 Brams Mind Care. Professional Psychiatric Care.",
  },
  bookingFailed: {
    title: "Payment Failed",
    body: "Your payment could not be completed. Don't worry — your appointment slot is still temporarily held.",
    ctas: [
      { id: "retry",   emoji: "🔄", label: "Retry Payment",    href: "/book?plan={planId}", variant: "primary"   },
      { id: "change",  emoji: "💳", label: "Change Method",    href: "/book?plan={planId}", variant: "secondary" },
      { id: "support", emoji: "💬", label: "Contact Support",  href: "mailto:support@bramsmindcare.com", variant: "secondary" },
    ],
    supportEmail: "support@bramsmindcare.com",
    troubleshootTitle: "Troubleshooting",
    troubleshootBody:
      "Please check your internet connection or contact your bank if the issue persists. No charges have been made to your account.",
  },
};
