import type { Metadata } from "next";
import { getSiteContent } from "../lib/api";
import { SITE } from "../lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: SITE.brand },
  description: SITE.description,
  alternates: { canonical: "/" },
  openGraph: {
    title:       SITE.brand,
    description: SITE.description,
    url:         SITE.url,
    type:        "website",
  },
};

import { TopNavBar } from "../components/TopNavBar";
import { HeroSection } from "../components/HeroSection";
import { SpecializedSupport } from "../components/SpecializedSupport";
import { HowItWorks } from "../components/HowItWorks";
import { PricingPlans } from "../components/PricingPlans";
import { NewsletterCTA } from "../components/NewsletterCTA";
import { Footer } from "../components/Footer";
import { FaqLd, ConsultationOffersLd } from "../components/JsonLd";

export default async function Home() {
  const content = await getSiteContent();

  return (
    <>
      <TopNavBar
        data={content.nav}
        ctaSlot={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a
              href="/patient/login"
              style={{
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
                fontWeight: 600,
                fontSize: 15,
                color: "#745475",
                padding: "10px 20px",
                borderRadius: 12,
                border: "1.5px solid rgba(116,84,117,0.3)",
                textDecoration: "none",
              }}
            >
              Login
            </a>
            <a
              href={content.nav.cta.href}
              style={{
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
                fontWeight: 600,
                fontSize: 16,
                background: "#c8a2c8",
                color: "#553757",
                padding: "10px 24px",
                borderRadius: 12,
                textDecoration: "none",
                boxShadow: "0 1px 1px rgba(0,0,0,0.05)",
              }}
            >
              {content.nav.cta.label}
            </a>
          </div>
        }
      />
      <main>
        <HeroSection data={content.hero} />
        <SpecializedSupport data={content.support} />
        <HowItWorks data={content.howItWorks} />
        <PricingPlans data={content.pricing} />
        <NewsletterCTA data={content.newsletter} />
      </main>
      <Footer data={content.footer} />

      {/* Homepage-specific structured data (AEO/GEO) */}
      <FaqLd />
      <ConsultationOffersLd />
    </>
  );
}
