"use client";

import { useState } from "react";
import styles from "./ShareButtons.module.scss";

type Props = { url: string; title: string };

export function ShareButtons({ url, title }: Props) {
  const [copied, setCopied] = useState(false);

  const encodedUrl   = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const networks = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      icon: <WhatsAppIcon />,
    },
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      icon: <XIcon />,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: <FacebookIcon />,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: <LinkedInIcon />,
    },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (older browser or insecure context) — no-op.
    }
  }

  return (
    <div className={styles.shareBar}>
      <span className={styles.label}>Share this article</span>
      <div className={styles.buttons}>
        {networks.map((n) => (
          <a
            key={n.label}
            href={n.href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.iconButton}
            aria-label={`Share on ${n.label}`}
          >
            {n.icon}
          </a>
        ))}
        <button
          type="button"
          onClick={copyLink}
          className={styles.iconButton}
          aria-label="Copy link"
        >
          {copied ? <CheckIcon /> : <LinkIcon />}
        </button>
      </div>
      <span className={styles.copiedToast} data-visible={copied}>Link copied</span>
    </div>
  );
}

// Small monochrome brand marks (currentColor) — kept inline so share buttons
// stay instantly recognizable without pulling in a brand-icon dependency.

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.04 2c-5.523 0-10 4.477-10 10 0 1.765.46 3.492 1.334 5.012L2 22l5.13-1.345A9.96 9.96 0 0 0 12.04 22c5.523 0 10-4.477 10-10s-4.477-10-10-10zm0 18.164a8.13 8.13 0 0 1-4.148-1.136l-.297-.176-3.043.798.812-2.966-.194-.304a8.15 8.15 0 0 1-1.253-4.38c0-4.508 3.67-8.176 8.183-8.176 2.187 0 4.242.852 5.787 2.398a8.13 8.13 0 0 1 2.396 5.788c0 4.508-3.67 8.154-8.243 8.154z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-8.06h2.7l.4-3.14h-3.1V7.8c0-.91.25-1.53 1.56-1.53H16.7V3.46A20.6 20.6 0 0 0 14.68 3.35c-2.4 0-4.04 1.46-4.04 4.15v2.32H7.9v3.14h2.74V21z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M6.94 8.5H3.56V20.4h3.38zM5.25 3.15a1.96 1.96 0 1 0 0 3.92 1.96 1.96 0 0 0 0-3.92zM20.45 20.4h-3.37v-6.06c0-1.44-.03-3.3-2.01-3.3-2.01 0-2.32 1.57-2.32 3.19v6.17H9.38V8.5h3.24v1.62h.05c.45-.85 1.55-1.74 3.19-1.74 3.41 0 4.04 2.25 4.04 5.17z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 4.5" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-2.83 2.83a5 5 0 0 0 7.07 7.07L12.5 19.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
