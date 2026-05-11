"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./layout.module.scss";

const NAV = [
  {
    group: "Content",
    items: [{ label: "Homepage", href: "/admin/content" }],
  },
  {
    group: "Users",
    items: [
      { label: "All Users",    href: "/admin/users"        },
      { label: "Create User",  href: "/admin/users/create" },
    ],
  },
  {
    group: "Static Pages",
    items: [
      { label: "Privacy Policy",           href: "/admin/pages/privacy-policy"    },
      { label: "Confidentiality Agreement",href: "/admin/pages/confidentiality"   },
      { label: "Terms of Service",         href: "/admin/pages/terms"             },
      { label: "Emergency Contact",        href: "/admin/pages/emergency-contact" },
      { label: "Contact Us",               href: "/admin/pages/contact"           },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Login page renders its own full layout
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
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navItem} ${active ? styles.navActive : ""}`}
                  >
                    {item.label}
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
