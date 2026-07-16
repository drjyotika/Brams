/**
 * Condition landing pages (admin-editable). Each is an SEO/AEO/GEO page at
 * /conditions/[slug] targeting the terms patients actually search
 * ("online psychiatrist for anxiety" etc.), with its own metadata, symptoms,
 * treatment overview, and FAQ — rendered visibly AND as MedicalWebPage +
 * FAQPage structured data from the same source.
 *
 * Content is general clinical information, not a diagnosis or a treatment
 * guarantee. Keep it accurate and evidence-based.
 */
export type ConditionFaq = { id: string; question: string; answer: string };

export type ConditionItem = {
  slug: string;
  name: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  symptomsTitle: string;
  symptoms: string[];
  treatmentTitle: string;
  treatment: string;
  faqs: ConditionFaq[];
};

export type ConditionsData = {
  eyebrow: string;
  title: string;
  description: string;
  items: ConditionItem[];
};

export const DEFAULT_CONDITIONS: ConditionsData = {
  eyebrow: "CONDITIONS WE TREAT",
  title: "Specialised online care, for the conditions that matter",
  description:
    "Confidential, evidence-based psychiatric care for adults across India — from the comfort of home.",
  items: [
    {
      slug: "anxiety",
      name: "Anxiety & panic disorders",
      metaTitle: "Online Treatment for Anxiety & Panic Disorders in India — Dr. Jyotika Kanwar",
      metaDescription:
        "Confidential online psychiatric care for anxiety and panic disorders across India. Evidence-based treatment — CBT guidance and medication management — with Dr. Jyotika Kanwar, MD Psychiatry (PGIMER Chandigarh).",
      h1: "Online treatment for anxiety & panic disorders",
      intro:
        "Anxiety becomes a clinical concern when worry, fear, or physical tension is persistent, hard to control, and starts to interfere with everyday life, sleep, work, or relationships. Anxiety and panic disorders are common and highly treatable — with the right support, most people experience meaningful relief.",
      symptomsTitle: "Common signs & symptoms",
      symptoms: [
        "Persistent or excessive worry",
        "Restlessness or feeling on edge",
        "Racing heart, palpitations or breathlessness",
        "Difficulty concentrating",
        "Trouble sleeping",
        "Panic attacks — sudden, intense fear",
        "Avoiding situations that trigger anxiety",
        "Muscle tension, headaches or fatigue",
      ],
      treatmentTitle: "How treatment works",
      treatment:
        "Your first session is really about understanding what your anxiety looks like day to day: when it started, what makes it worse, how it's getting in the way of your life. From there, Dr. Jyotika builds a plan around you, which might mean CBT-based therapy techniques, medication, or often both together. Nothing gets decided without talking it through with you first, and the plan shifts as you improve.",
      faqs: [
        {
          id: "anx-online",
          question: "Can anxiety be treated online?",
          answer:
            "Very much so. Anxiety and panic disorders respond well to online care, since so much of the assessment and follow-up happens through conversation. After an initial video assessment, Dr. Jyotika puts together a plan that might include therapy guidance, medication, or both, with regular check-ins to see how things are going.",
        },
        {
          id: "anx-meds",
          question: "Will I need medication for anxiety?",
          answer:
            "Not necessarily. Plenty of people see real improvement through CBT, structured support, and changes to daily habits alone. Medication only comes into it when it makes clinical sense, and it's always discussed with you first, never started without your input.",
        },
        {
          id: "anx-time",
          question: "How long does anxiety treatment take?",
          answer:
            "It really depends on you and how severe things have been. Most people start noticing changes within a few weeks, with improvement building over the following months as the plan gets reviewed and adjusted.",
        },
      ],
    },
    {
      slug: "depression",
      name: "Depression & mood disorders",
      metaTitle: "Online Depression Treatment in India — Dr. Jyotika Kanwar, Psychiatrist",
      metaDescription:
        "Confidential online treatment for depression and mood disorders across India. Evidence-based psychiatric care with Dr. Jyotika Kanwar, MD Psychiatry (PGIMER Chandigarh) — therapy guidance and medication management.",
      h1: "Online treatment for depression & mood disorders",
      intro:
        "Depression is more than feeling low — it is a persistent change in mood, energy, and interest that lasts for weeks and affects daily functioning. It is common, and it is treatable. Seeking help early can make recovery faster and fuller.",
      symptomsTitle: "Common signs & symptoms",
      symptoms: [
        "Low or sad mood most of the day",
        "Loss of interest or pleasure in activities",
        "Fatigue or low energy",
        "Changes in sleep or appetite",
        "Difficulty concentrating or making decisions",
        "Feelings of guilt or worthlessness",
        "Slowed thoughts or movements",
        "Thoughts of self-harm — please seek urgent help",
      ],
      treatmentTitle: "How treatment works",
      treatment:
        "The first conversation is about how you've been feeling, for how long, and what's changed in your daily life and habits. Depression responds well to treatment, and for many people that means a mix of therapy support and, where it helps, medication. Dr. Jyotika checks in at every follow-up so the plan can adjust as you start to feel like yourself again.",
      faqs: [
        {
          id: "dep-online",
          question: "Is online treatment effective for depression?",
          answer:
            "For most people, yes. A confidential video assessment gives Dr. Jyotika what she needs to build a plan around you, and follow-up sessions track how you're doing so treatment can be adjusted along the way.",
        },
        {
          id: "dep-diff",
          question: "How is clinical depression different from feeling sad?",
          answer:
            "Sadness comes and goes. Clinical depression sticks around, low mood, losing interest in things you used to enjoy, changes in sleep or appetite, for two weeks or more, and it starts getting in the way of daily life. If that sounds familiar, it's worth getting a proper assessment.",
        },
        {
          id: "dep-urgent",
          question: "What if I'm having thoughts of self-harm?",
          answer:
            "If you're in immediate danger, please contact emergency services or India's iCall helpline at +91-9152987821 right away. Brams Mind Care isn't set up for emergencies, but for urgent non-crisis support, same-day appointments are available.",
        },
      ],
    },
    {
      slug: "adult-adhd",
      name: "Adult ADHD",
      metaTitle: "Adult ADHD Evaluation & Treatment Online in India — Dr. Jyotika Kanwar",
      metaDescription:
        "Online adult ADHD evaluation and management across India. Confidential, evidence-based psychiatric assessment with Dr. Jyotika Kanwar, MD Psychiatry (PGIMER Chandigarh).",
      h1: "Adult ADHD — online evaluation & management",
      intro:
        "Attention-deficit/hyperactivity disorder often continues into adulthood and frequently goes unrecognised. When focus, organisation, and impulsivity consistently affect work, studies, or relationships, a proper evaluation can bring clarity — and effective management can make a real difference.",
      symptomsTitle: "Common signs in adults",
      symptoms: [
        "Difficulty sustaining attention or focus",
        "Restlessness or inner tension",
        "Disorganisation and difficulty planning",
        "Procrastination and trouble finishing tasks",
        "Forgetfulness in daily activities",
        "Impulsivity in decisions or speech",
        "Poor time management",
        "Difficulty regulating emotions",
      ],
      treatmentTitle: "How evaluation & treatment works",
      treatment:
        "Because ADHD symptoms overlap with several other conditions, the first step is a detailed evaluation to make sure the diagnosis is actually right. If it is ADHD, treatment centres on what genuinely helps you function better, whether that's practical strategies for organisation and time management, medication, or a combination. Everything gets reviewed and fine-tuned at your follow-ups.",
      faqs: [
        {
          id: "adhd-adult",
          question: "Can adults be diagnosed with ADHD?",
          answer:
            "Definitely. ADHD often carries into adulthood, and plenty of people are diagnosed for the first time later in life. A structured evaluation looks closely at your history and current symptoms to reach an accurate diagnosis.",
        },
        {
          id: "adhd-online",
          question: "Can ADHD be assessed online?",
          answer:
            "Yes, a full evaluation can be done over secure video, including a detailed look at your history and a validated assessment. Dr. Jyotika walks you through what she finds and what a management plan could look like for you.",
        },
        {
          id: "adhd-meds",
          question: "Does ADHD treatment always involve medication?",
          answer:
            "No, not always. Behavioural strategies, structure, and therapy guidance often do most of the work on their own. Medication only comes up when it's clinically appropriate, and it's always a conversation with you first, never a default.",
        },
      ],
    },
    {
      slug: "trauma",
      name: "Trauma & PTSD",
      metaTitle: "Online Trauma & PTSD Treatment in India — Dr. Jyotika Kanwar, Psychiatrist",
      metaDescription:
        "Confidential online psychiatric care for trauma and PTSD across India. Safe, evidence-based support with Dr. Jyotika Kanwar, MD Psychiatry (PGIMER Chandigarh).",
      h1: "Online support for trauma & PTSD",
      intro:
        "Difficult or overwhelming experiences can leave lasting effects on how you feel, think, and sleep. When these reactions persist and interfere with daily life, structured psychiatric support can help you process what happened and regain a sense of safety and control.",
      symptomsTitle: "Common signs & symptoms",
      symptoms: [
        "Intrusive memories or flashbacks",
        "Distressing dreams or nightmares",
        "Avoiding reminders of the event",
        "Feeling on guard or easily startled",
        "Emotional numbness or detachment",
        "Irritability or angry outbursts",
        "Difficulty sleeping or concentrating",
        "Persistent fear, guilt or shame",
      ],
      treatmentTitle: "How treatment works",
      treatment:
        "There's no rush here. Sessions move at whatever pace you're ready for, in a space that stays private and free of judgement. Depending on what you've been through, treatment might involve trauma-focused therapy techniques, medication to help with symptoms like sleep or anxiety, or both. Dr. Jyotika works to your pace, not a fixed schedule.",
      faqs: [
        {
          id: "trauma-online",
          question: "Can trauma be treated over video?",
          answer:
            "Yes, and many people actually find it easier this way, since they can talk from a space that feels private and familiar rather than a clinic. Treatment is paced carefully and shaped around what you need.",
        },
        {
          id: "trauma-time",
          question: "How long does trauma treatment take?",
          answer:
            "There's genuinely no fixed timeline, it depends on what you've been through and what you're working toward. Care is reviewed regularly and moves at whatever pace feels safe for you.",
        },
        {
          id: "trauma-ready",
          question: "What if I'm not ready to talk about what happened?",
          answer:
            "That's completely okay, and it's more common than you'd think. You're never expected to share more than you're comfortable with. Early sessions are really about building safety and trust before anything difficult gets explored.",
        },
      ],
    },
  ],
};
