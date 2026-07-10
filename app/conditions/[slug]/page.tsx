import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteContent } from "../../../lib/api";
import { SITE } from "../../../lib/seo";
import type { NavData } from "../../../lib/content";
import { TopNavBar } from "../../../components/TopNavBar";
import { Footer } from "../../../components/Footer";
import { ConditionPage } from "../../../components/ConditionPage";
import { ConditionLd, BreadcrumbsLd } from "../../../components/JsonLd";
import { DEFAULT_CONDITIONS } from "../../../lib/conditions";

type Params = { params: Promise<{ slug: string }> };

// Only the known condition slugs are valid routes; any other slug returns a
// real 404 (avoids soft-404s). Pages still render dynamically, so content edits
// go live immediately — but ADDING a new condition needs a redeploy to register
// its route here.
export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const content = await getSiteContent();
    const items = content.conditions?.items ?? [];
    if (items.length) return items.map((c) => ({ slug: c.slug }));
  } catch {
    /* fall back to defaults below */
  }
  return DEFAULT_CONDITIONS.items.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const content = await getSiteContent();
  const c = content.conditions.items.find((x) => x.slug === slug);
  if (!c) notFound(); // bail in metadata too so the response is a real 404, not a soft-404
  return {
    title:       c.metaTitle,
    description: c.metaDescription,
    alternates:  { canonical: `/conditions/${c.slug}` },
    openGraph: {
      title:       c.metaTitle,
      description: c.metaDescription,
      url:         `${SITE.url}/conditions/${c.slug}`,
      type:        "article",
      images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: SITE.brand }],
    },
  };
}

/** Prefix bare `#hash` nav hrefs with `/` so they point at homepage sections. */
function toHomeLinks(nav: NavData): NavData {
  const fix = (href: string) => (href.startsWith("#") ? `/${href}` : href);
  return {
    ...nav,
    links: nav.links.map((l) => ({ ...l, href: fix(l.href) })),
    cta:   { ...nav.cta, href: fix(nav.cta.href) },
  };
}

export default async function ConditionRoute({ params }: Params) {
  const { slug } = await params;
  const content = await getSiteContent();
  const condition = content.conditions.items.find((x) => x.slug === slug);
  if (!condition) notFound();

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

      <ConditionPage data={condition} bookHref="/book" />

      <Footer data={content.footer} />

      <ConditionLd condition={condition} />
      <BreadcrumbsLd
        items={[
          { name: "Home", url: "/" },
          { name: condition.name, url: `/conditions/${condition.slug}` },
        ]}
      />
    </>
  );
}
