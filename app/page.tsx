import { getSiteContent } from "../lib/api";

export const dynamic = "force-dynamic";
import { TopNavBar } from "../components/TopNavBar";
import { HeroSection } from "../components/HeroSection";
import { SpecializedSupport } from "../components/SpecializedSupport";
import { HowItWorks } from "../components/HowItWorks";
import { PricingPlans } from "../components/PricingPlans";
import { NewsletterCTA } from "../components/NewsletterCTA";
import { Footer } from "../components/Footer";

export default async function Home() {
  const content = await getSiteContent();

  return (
    <>
      <TopNavBar data={content.nav} />
      <main>
        <HeroSection data={content.hero} />
        <SpecializedSupport data={content.support} />
        <HowItWorks data={content.howItWorks} />
        <PricingPlans data={content.pricing} />
        <NewsletterCTA data={content.newsletter} />
      </main>
      <Footer data={content.footer} />
    </>
  );
}
