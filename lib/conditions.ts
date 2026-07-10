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
        "Dr. Jyotika Kanwar provides evidence-based, ICD-11–informed assessment and care for anxiety and panic disorders. Treatment is tailored to you and may combine psychotherapy guidance — including cognitive behavioural therapy (CBT) — with medication management where clinically appropriate. Care is collaborative and reviewed over time, all over a secure, private video consultation.",
      faqs: [
        {
          id: "anx-online",
          question: "Can anxiety be treated online?",
          answer:
            "Yes. Anxiety and panic disorders are well suited to online psychiatric care. After a confidential video assessment, Dr. Jyotika creates a personalised plan that may include therapy guidance and, where appropriate, medication — with follow-ups to track your progress.",
        },
        {
          id: "anx-meds",
          question: "Will I need medication for anxiety?",
          answer:
            "Not always. Many people improve with psychotherapy approaches such as CBT, structured support, and lifestyle changes. Medication is considered only when clinically appropriate, and is always discussed with you before starting.",
        },
        {
          id: "anx-time",
          question: "How long does anxiety treatment take?",
          answer:
            "It varies by person and severity. Many people notice improvement within a few weeks of starting treatment, with continued gains over the following months as the plan is reviewed and adjusted.",
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
        "Care begins with a thorough psychiatric evaluation to understand your symptoms and their impact. Treatment for depression and mood disorders is individualised and evidence-based — combining psychotherapy guidance with medication management where clinically appropriate, and regular review to track recovery. Every consultation is private and conducted over secure video.",
      faqs: [
        {
          id: "dep-online",
          question: "Is online treatment effective for depression?",
          answer:
            "Yes. Online psychiatric care for depression is effective for most people. A confidential video assessment leads to a personalised plan, with follow-ups to monitor progress and adjust treatment as needed.",
        },
        {
          id: "dep-diff",
          question: "How is clinical depression different from feeling sad?",
          answer:
            "Sadness is a normal, passing emotion. Clinical depression is persistent — low mood, loss of interest, and changes in sleep, energy, or appetite lasting two weeks or more and interfering with daily life. If that sounds familiar, a professional assessment can help.",
        },
        {
          id: "dep-urgent",
          question: "What if I'm having thoughts of self-harm?",
          answer:
            "If you are in immediate danger, please contact local emergency services or India's iCall helpline at +91-9152987821 right away. Brams Mind Care is not an emergency service, but for urgent non-crisis support, same-day appointments are available.",
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
        "Management begins with a comprehensive diagnostic evaluation to distinguish ADHD from other conditions with overlapping symptoms. Where ADHD is confirmed, an individualised plan may combine behavioural strategies and psychotherapy guidance with medication management when clinically appropriate — all reviewed over secure online follow-ups.",
      faqs: [
        {
          id: "adhd-adult",
          question: "Can adults be diagnosed with ADHD?",
          answer:
            "Yes. ADHD frequently persists into adulthood and can be diagnosed for the first time as an adult. A structured psychiatric evaluation reviews your history and current symptoms to reach an accurate diagnosis.",
        },
        {
          id: "adhd-online",
          question: "Can ADHD be assessed online?",
          answer:
            "A comprehensive ADHD evaluation can be conducted over secure video, including detailed history-taking and validated assessment. Dr. Jyotika will explain the findings and discuss a management plan tailored to you.",
        },
        {
          id: "adhd-meds",
          question: "Does ADHD treatment always involve medication?",
          answer:
            "No. Treatment is individualised. Behavioural strategies, structure, and psychotherapy guidance are often central, with medication considered only where clinically appropriate and always discussed with you first.",
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
        "Care is provided in a safe, confidential, and judgement-free space. Treatment for trauma and PTSD is paced to you — combining specialised psychotherapeutic approaches with medication management where clinically appropriate — and delivered over secure video so you can engage from a place where you feel comfortable.",
      faqs: [
        {
          id: "trauma-online",
          question: "Can trauma be treated over video?",
          answer:
            "Yes. Many people find online consultations comfortable and effective for trauma-related care, as they can engage from a private, familiar space. Treatment is paced carefully and tailored to your needs.",
        },
        {
          id: "trauma-time",
          question: "How long does trauma treatment take?",
          answer:
            "There is no fixed timeline — it depends on the nature of the experience and your goals. Care is collaborative and reviewed regularly, moving at a pace that feels safe for you.",
        },
        {
          id: "trauma-ready",
          question: "What if I'm not ready to talk about what happened?",
          answer:
            "That's completely okay. You are never required to share more than you're comfortable with. Early sessions focus on safety, stability, and building trust before exploring difficult experiences.",
        },
      ],
    },
  ],
};
