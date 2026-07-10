import type { Metadata } from "next";
import { getSiteContent } from "../../lib/api";
import { SITE } from "../../lib/seo";
import { listPublishedPosts } from "../../lib/blog";
import type { NavData } from "../../lib/content";
import { TopNavBar } from "../../components/TopNavBar";
import { Footer } from "../../components/Footer";
import { BlogPage } from "../../components/BlogPage";
import { BreadcrumbsLd } from "../../components/JsonLd";

const PAGE_SIZE = 12;

export const metadata: Metadata = {
  title: "Blog — Insights on Mental Health & Wellbeing",
  description:
    "Articles from Dr. Jyotika Kanwar, Consultant Psychiatrist, on anxiety, depression, ADHD, trauma, and everyday mental wellness.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title:       "Blog — Brams Mind Care",
    description: "Insights on mental health & wellbeing from Dr. Jyotika Kanwar.",
    url:         `${SITE.url}/blog`,
    type:        "website",
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

type Props = { searchParams: Promise<{ page?: string }> };

export default async function BlogIndexRoute({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const [content, { posts, total }] = await Promise.all([
    getSiteContent(),
    listPublishedPosts({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
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

      <BlogPage posts={posts} page={page} totalPages={totalPages} />

      <Footer data={content.footer} />

      <BreadcrumbsLd items={[{ name: "Home", url: "/" }, { name: "Blog", url: "/blog" }]} />
    </>
  );
}
