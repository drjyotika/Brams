"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./layout.module.scss";

// ─── Nav definition ───────────────────────────────────────────────────────────

type CountKey = "patients" | "appointments" | "helpRequests" | "altRequests";

const NAV = [
  {
    group: "Content",
    items: [{ label: "Homepage", href: "/admin/content" }],
  },
  {
    group: "Blog",
    items: [
      { label: "All Posts", href: "/admin/blog"     },
      { label: "New Post",  href: "/admin/blog/new" },
    ],
  },
  {
    group: "Bookings",
    items: [
      { label: "Patients",           href: "/admin/patients",             countKey: "patients"     as CountKey },
      { label: "Appointments",       href: "/admin/appointments",         countKey: "appointments" as CountKey },
      { label: "Help Requests",      href: "/admin/help-requests",        countKey: "helpRequests" as CountKey },
      { label: "Alt. Slot Requests", href: "/admin/alternative-requests", countKey: "altRequests"  as CountKey },
    ],
  },
  {
    group: "Comms",
    items: [
      { label: "Newsletter", href: "/admin/newsletter" },
      { label: "Coupons",    href: "/admin/coupons"    },
      { label: "Feedback",   href: "/admin/feedback"   },
      { label: "Settings",   href: "/admin/settings"   },
    ],
  },
  {
    group: "Users",
    items: [
      { label: "All Users",   href: "/admin/users"        },
      { label: "Create User", href: "/admin/users/create" },
    ],
  },
  {
    group: "Static Pages",
    items: [
      { label: "Privacy Policy",            href: "/admin/pages/privacy-policy"    },
      { label: "Confidentiality Agreement", href: "/admin/pages/confidentiality"   },
      { label: "Terms of Service",          href: "/admin/pages/terms"             },
      { label: "Emergency Contact",         href: "/admin/pages/emergency-contact" },
      { label: "Contact Us",                href: "/admin/pages/contact"           },
    ],
  },
];

// Map each tracked href → its CountKey
const HREF_TO_KEY: Record<string, CountKey> = {
  "/admin/patients":             "patients",
  "/admin/appointments":         "appointments",
  "/admin/help-requests":        "helpRequests",
  "/admin/alternative-requests": "altRequests",
};

// localStorage keys for "last visited" timestamps
const LS: Record<CountKey, string> = {
  patients:     "brams_seen_patients",
  appointments: "brams_seen_appointments",
  helpRequests: "brams_seen_help_requests",
  altRequests:  "brams_seen_alt_requests",
};

function getLastSeen(key: CountKey): string {
  try {
    return localStorage.getItem(LS[key]) ?? startOfToday();
  } catch {
    return startOfToday();
  }
}

function markSeen(key: CountKey) {
  try { localStorage.setItem(LS[key], new Date().toISOString()); } catch { /* ignore */ }
}

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<Record<CountKey, number>>({
    patients: 0, appointments: 0, helpRequests: 0, altRequests: 0,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCounts = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        patientsSince:     getLastSeen("patients"),
        appointmentsSince: getLastSeen("appointments"),
        helpSince:         getLastSeen("helpRequests"),
        altSince:          getLastSeen("altRequests"),
      });
      const res = await fetch(`/api/admin/counts?${params}`);
      if (res.ok) setCounts(await res.json());
    } catch { /* silent — badge just stays at 0 */ }
  }, []);

  // Initial fetch + refresh every 60 s
  useEffect(() => {
    fetchCounts();
    timerRef.current = setInterval(fetchCounts, 60_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchCounts]);

  // When admin navigates into a tracked section, mark it seen and clear its badge
  useEffect(() => {
    const key = Object.entries(HREF_TO_KEY).find(
      ([href]) => pathname === href || pathname.startsWith(href + "/"),
    )?.[1] as CountKey | undefined;

    if (!key) return;
    markSeen(key);
    setCounts((prev) => ({ ...prev, [key]: 0 }));
  }, [pathname]);

  // Login page has its own layout
  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Brams Mind Care" className={styles.logo} />
        </div>

        <nav className={styles.nav}>
          {NAV.map((g) => (
            <div key={g.group} className={styles.group}>
              <span className={styles.groupLabel}>{g.group}</span>
              {g.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href));
                const ck = "countKey" in item ? (item as { countKey: CountKey }).countKey : undefined;
                const count = ck ? counts[ck] : 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navItem} ${active ? styles.navActive : ""}`}
                  >
                    <span className={styles.navLabel}>{item.label}</span>
                    {count > 0 && (
                      <span className={styles.badge}>
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <a href="/" target="_blank" rel="noreferrer" className={styles.viewSite}>
            View site ↗
          </a>
          <button
            className={styles.logoutBtn}
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/admin/login";
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
