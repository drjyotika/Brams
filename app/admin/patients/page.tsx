"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import tStyles from "../users/users.module.scss";
import pStyles from "./patients.module.scss";
import { BramsLoader } from "../../../components/BramsLoader";

type Patient = {
  id: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  appointment_count: number;
  last_appointment_date: string | null;
  created_at: string;
  email_verified: boolean;
  is_suspended:   boolean;
  has_password:   boolean;
};

type SortKey =
  | "newest" | "oldest"
  | "name_asc" | "name_desc"
  | "sessions_desc" | "last_session";

const PAGE_SIZES = [10, 20, 50];
const DEFAULT_PAGE_SIZE = 10;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest",        label: "Newest first"       },
  { value: "oldest",        label: "Oldest first"       },
  { value: "name_asc",      label: "Name A → Z"         },
  { value: "name_desc",     label: "Name Z → A"         },
  { value: "sessions_desc", label: "Most sessions"      },
  { value: "last_session",  label: "Last session (new)" },
];

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const datePart = iso.slice(0, 10);
  return new Date(datePart + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function sortPatients(list: Patient[], key: SortKey): Patient[] {
  const a = [...list];
  switch (key) {
    case "newest":
      return a.sort((x, y) => y.created_at.localeCompare(x.created_at));
    case "oldest":
      return a.sort((x, y) => x.created_at.localeCompare(y.created_at));
    case "name_asc":
      return a.sort((x, y) => x.full_name.localeCompare(y.full_name));
    case "name_desc":
      return a.sort((x, y) => y.full_name.localeCompare(x.full_name));
    case "sessions_desc":
      return a.sort((x, y) => y.appointment_count - x.appointment_count);
    case "last_session":
      return a.sort((x, y) => {
        if (!x.last_appointment_date && !y.last_appointment_date) return 0;
        if (!x.last_appointment_date) return 1;
        if (!y.last_appointment_date) return -1;
        return y.last_appointment_date.localeCompare(x.last_appointment_date);
      });
    default:
      return a;
  }
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [visible,  setVisible]  = useState(DEFAULT_PAGE_SIZE);
  const [sortKey,  setSortKey]  = useState<SortKey>("newest");

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then((d) => { setPatients(d); setLoading(false); });
  }, []);

  const sorted   = useMemo(() => sortPatients(patients, sortKey), [patients, sortKey]);
  const shown    = sorted.slice(0, visible);
  const hasMore  = visible < sorted.length;
  const remaining = sorted.length - visible;

  function handlePageSize(n: number) {
    setPageSize(n);
    setVisible(n);
  }

  function handleSort(key: SortKey) {
    setSortKey(key);
    setVisible(pageSize); // reset to top when sort changes
  }

  return (
    <div>
      <div className={tStyles.header}>
        <h1 className={tStyles.title}>Patients</h1>
        {patients.length > 0 && (
          <div className={pStyles.controls}>
            <select
              className={pStyles.pageSizeSelect}
              value={sortKey}
              onChange={(e) => handleSort(e.target.value as SortKey)}
              aria-label="Sort by"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              className={pStyles.pageSizeSelect}
              value={pageSize}
              onChange={(e) => handlePageSize(Number(e.target.value))}
              aria-label="Records per page"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>{n} per page</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <BramsLoader />
      ) : (
        <div className={tStyles.card}>
          <table className={tStyles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Status</th>
                <th>City</th>
                <th>Sessions</th>
                <th>Last Session</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 && (
                <tr>
                  <td colSpan={8} className={tStyles.empty}>
                    No patients yet. Bookings will appear here.
                  </td>
                </tr>
              )}
              {shown.map((p) => (
                <tr key={p.id}>
                  <td className={tStyles.username}>
                    {p.full_name}
                    {p.age && (
                      <span style={{ color: "#9b8fa0", marginLeft: 6 }}>
                        · {p.age}{p.gender ? ` · ${p.gender}` : ""}
                      </span>
                    )}
                  </td>
                  <td>{p.phone}</td>
                  <td>{p.email ?? "—"}</td>
                  <td>
                    <StatusPills
                      suspended={p.is_suspended}
                      verified={p.email_verified}
                      hasPassword={p.has_password}
                    />
                  </td>
                  <td>{p.city ?? "—"}</td>
                  <td>{p.appointment_count}</td>
                  <td>{fmtDate(p.last_appointment_date)}</td>
                  <td className={tStyles.actions}>
                    <Link href={`/admin/patients/${p.id}`} className={tStyles.editBtn}>
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {hasMore && (
            <div className={pStyles.paginationBar}>
              <span className={pStyles.paginationCount}>
                Showing <strong>{shown.length}</strong> of <strong>{sorted.length}</strong> patients
              </span>
              <button
                className={pStyles.loadMoreBtn}
                onClick={() => setVisible((v) => Math.min(v + pageSize, sorted.length))}
              >
                Load {Math.min(pageSize, remaining)} more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Status pills ────────────────────────────────────────────────────────────

function StatusPills({
  suspended,
  verified,
  hasPassword,
}: {
  suspended:   boolean;
  verified:    boolean;
  hasPassword: boolean;
}) {
  const pill = (label: string, bg: string, fg: string) => (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 999,
      fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
      textTransform: "uppercase", background: bg, color: fg,
      marginRight: 4, marginBottom: 2,
    }}>{label}</span>
  );

  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap" }}>
      {suspended      ? pill("Suspended", "#fee2e2", "#991b1b")
        : verified    ? pill("Verified",  "#d1fae5", "#065f46")
        : hasPassword ? pill("Unverified","#fef3c7", "#92400e")
        :               pill("Guest",     "#f3f4f6", "#4b5563")}
    </span>
  );
}
