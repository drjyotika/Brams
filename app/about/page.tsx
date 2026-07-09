import type { Metadata } from "next";
import { getSiteContent } from "../../lib/api";
import { SITE } from "../../lib/seo";
import type { NavData } from "../../lib/content";
import { TopNavBar } from "../../components/TopNavBar";
import { Footer } from "../../components/Footer";
import { AboutPage } from "../../components/AboutPage";
import { AboutLd, BreadcrumbsLd } from "../../components/JsonLd";

export const metadata: Metadata = {
  title: "About Dr. Jyotika Kanwar — Consultant Psychiatrist",
  description:
    "Meet Dr. Jyotika Kanwar, MD Psychiatry (PGIMER, Chandigarh) — a consultant psychiatrist offering confidential, evidence-based online mental health care for anxiety, depression, adult ADHD, and trauma across India.",
  alternates: { canonical: "/about" },
  openGraph: {
    title:       "About Dr. Jyotika Kanwar — Consultant Psychiatrist",
    description: "Confidential, evidence-based online psychiatric care across India.",
    url:         `${SITE.url}/about`,
    type:        "profile",
    images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: SITE.brand }],
  },
};

/** Prefix bare `#hash` nav hrefs with `/` so they point at homepage sections. */
function toHomeLinks(nav: NavData): NavData {
  const fix = (href: string) => (href.startsWith("#") ? `/${href}` : href);
  return {
    ...nav,
    links: nav.links.map((l) => ({ ...l, href: fix(l.href) })),
    cta:   { ...nav.cta, href: fix(nav.cta.href) },
  };
}

export default async function AboutRoute() {
  const content = await getSiteContent();
  const nav = toHomeLinks(content.nav);

  return (
    <>
      <TopNavBar
        data={nav}
        ctaSlot={
          <div className="topnav-cta-row">
            <a href="/patient/login" className="topnav-login-link">Patient Login</a>
            <a href={nav.cta.href} className="topnav-primary-cta">{nav.cta.label}</a>
          </div>
        }
        mobileMenuItems={[
          { label: "Patient Login", href: "/patient/login" },
          ...nav.links.map((l) => ({ label: l.label, href: l.href })),
        ]}
      />

      <AboutPage data={content.about} bookHref="/book" />

      <Footer data={content.footer} />

      <AboutLd about={content.about} />
      <BreadcrumbsLd items={[{ name: "Home", url: "/" }, { name: "About", url: "/about" }]} />
    </>
  );
}
