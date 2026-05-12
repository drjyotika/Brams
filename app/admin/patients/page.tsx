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
};

const PAGE_SIZES = [5, 10, 20, 50];
const DEFAULT_PAGE_SIZE = 5;

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
                <th>City</th>
                <th>Sessions</th>
                <th>Last Session</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 && (
                <tr>
                  <td colSpan={7} className={tStyles.empty}>
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
                  <td>{p.city ?? "—"}</td>
                  <td>{p.appointment_count}</td>
                  <td>
                    {p.last_appointment_date
                      ? new Date(p.last_appointment_date).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td className={tStyles.actions}>
                    <Link href={`/admin/patients/${p.id}`} className={tStyles.editBtn}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination bar */}
          {patients.length > 0 && (
            <div className={pStyles.paginationBar}>
              <span className={pStyles.paginationCount}>
                Showing <strong>{shown.length}</strong> of <strong>{patients.length}</strong> patients
              </span>
              <div className={pStyles.paginationRight}>
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
                {hasMore && (
                  <button
                    className={pStyles.loadMoreBtn}
                    onClick={() => setVisible((v) => Math.min(v + pageSize, patients.length))}
                  >
                    Load {Math.min(pageSize, remaining)} more
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
