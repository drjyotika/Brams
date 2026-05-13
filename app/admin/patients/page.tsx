"use client";

import { useEffect, useState } from "react";
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

const PAGE_SIZES = [10, 20, 50];
const DEFAULT_PAGE_SIZE = 10;

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [visible,  setVisible]  = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then((d) => { setPatients(d); setLoading(false); });
  }, []);

  const shown   = patients.slice(0, visible);
  const hasMore = visible < patients.length;
  const remaining = patients.length - visible;

  function handlePageSize(n: number) {
    setPageSize(n);
    setVisible(n); // reset to first page when size changes
  }

  return (
    <div>
      <div className={tStyles.header}>
        <h1 className={tStyles.title}>Patients</h1>
        {patients.length > 0 && (
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
                  <td>
                    {p.last_appointment_date
                      ? new Date(p.last_appointment_date).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td className={tStyles.actions}>
                    <Link href={`/admin/patients/${p.id}`} className={tStyles.editBtn}>
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination bar */}
          {hasMore && (
            <div className={pStyles.paginationBar}>
              <span className={pStyles.paginationCount}>
                Showing <strong>{shown.length}</strong> of <strong>{patients.length}</strong> patients
              </span>
              <button
                className={pStyles.loadMoreBtn}
                onClick={() => setVisible((v) => Math.min(v + pageSize, patients.length))}
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
