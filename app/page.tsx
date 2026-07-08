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
    // Must be re-declared here: a page-level openGraph block replaces the
    // root layout's, so without this the og:image would be dropped.
    images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: SITE.brand }],
  },
};

import { TopNavBar } from "../components/TopNavBar";
import { HeroSection } from "../components/HeroSection";
import { SpecializedSupport } from "../components/SpecializedSupport";
import { HowItWorks } from "../components/HowItWorks";
import { PricingPlans } from "../components/PricingPlans";
import { FaqSection } from "../components/FaqSection";
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
          <div className="topnav-cta-row">
            <a href="/patient/login" className="topnav-login-link">Patient Login</a>
            <a href={content.nav.cta.href} className="topnav-primary-cta topnav-primary-cta--home">
              {content.nav.cta.label}
            </a>
          </div>
        }
        mobileMenuItems={[
          { label: "Patient Login", href: "/patient/login" },
          ...content.nav.links.map((l) => ({ label: l.label, href: l.href })),
        ]}
      />
      <main>
        <HeroSection data={content.hero} />
        <SpecializedSupport data={content.support} />
        <HowItWorks data={content.howItWorks} />
        <PricingPlans data={content.pricing} />
        <FaqSection />
        <NewsletterCTA data={content.newsletter} />
      </main>
      <Footer data={content.footer} />

      {/* Homepage-specific structured data (AEO/GEO) */}
      <FaqLd />
      <ConsultationOffersLd />
    </>
  );
}
