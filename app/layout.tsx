import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Manrope, Inter } from "next/font/google";
import "../styles/globals.scss";
import { SITE } from "../lib/seo";
import { OrganizationLd, PhysicianLd, WebsiteLd } from "../components/JsonLd";
import { MotionObserver } from "../components/motion/MotionObserver";
import { GoogleAnalytics } from "@next/third-parties/google";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default:  SITE.brand,
    template: `%s - ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "online psychiatrist India",
    "psychiatric consultation online",
    "Dr. Jyotika Kanwar",
    "Brams Mind Care",
    "anxiety treatment online",
    "depression treatment online",
    "ADHD evaluation India",
    "trauma therapy online",
    "mental health India",
    "telepsychiatry India",
    "online mental health consultation",
  ],
  authors: [{ name: "Dr. Jyotika Kanwar" }],
  creator: "Brams Mind Care",
  publisher: "Brams Mind Care",
  category: "Health & Medical",
  formatDetection: {
    email:     false,
    address:   false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type:        "website",
    locale:      SITE.locale,
    url:         SITE.url,
    siteName:    SITE.name,
    title:       SITE.brand,
    description: SITE.description,
    images: [
      {
        url:    SITE.ogImage,
        width:  1200,
        height: 630,
        alt:    "Dr. Jyotika Kanwar - Brams Mind Care",
      },
    ],
  },
  twitter: {
    card:        "summary_large_image",
    title:       SITE.brand,
    description: SITE.shortDescription,
    images:      [SITE.ogImage],
  },
  robots: {
    index:  true,
    follow: true,
    googleBot: {
      index:        true,
      follow:       true,
      "max-snippet":          -1,
      "max-image-preview":    "large",
      "max-video-preview":    -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple:    "/icon.png",
  },
  manifest: "/manifest.webmanifest",
  // Add Google Search Console verification token when provisioned:
  // verification: { google: "VERIFICATION_TOKEN_HERE" },
};

export const viewport: Viewport = {
  themeColor:      SITE.themeColor,
  width:           "device-width",
  initialScale:    1,
  maximumScale:    5,
  colorScheme:     "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={SITE.language} className={`${manrope.variable} ${inter.variable}`}>
      <body>
        {children}
        {/* Global JSON-LD — site-wide entities for AEO/GEO ingestion */}
        <OrganizationLd />
        <PhysicianLd />
        <WebsiteLd />
        {/* Scroll-reveal IntersectionObserver — sets html.motion-ready */}
        <MotionObserver />
      </body>
      {/* Google Analytics 4 — only loads when NEXT_PUBLIC_GA_ID is configured */}
      {process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      )}
    </html>
  );
}
