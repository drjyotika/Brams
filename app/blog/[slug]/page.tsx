import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteContent } from "../../../lib/api";
import { SITE } from "../../../lib/seo";
import { getPublishedPostBySlug } from "../../../lib/blog";
import type { NavData } from "../../../lib/content";
import { TopNavBar } from "../../../components/TopNavBar";
import { Footer } from "../../../components/Footer";
import { BlogPostPage } from "../../../components/BlogPostPage";
import { ArticleLd, BreadcrumbsLd } from "../../../components/JsonLd";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return { title: "Article not found", robots: { index: false } };

  const title       = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || undefined;

  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      url:    `${SITE.url}/blog/${post.slug}`,
      type:   "article",
      images: [{ url: post.cover_image || SITE.ogImage, width: 1200, height: 630, alt: post.title }],
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

export default async function BlogPostRoute({ params }: Params) {
  const { slug } = await params;
  const [content, post] = await Promise.all([getSiteContent(), getPublishedPostBySlug(slug)]);
  if (!post) notFound();

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

      <BlogPostPage post={post} bookHref="/book" />

      <Footer data={content.footer} />

      <ArticleLd post={post} />
      <BreadcrumbsLd
        items={[
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
          { name: post.title, url: `/blog/${post.slug}` },
        ]}
      />
    </>
  );
}
