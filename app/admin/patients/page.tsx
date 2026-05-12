"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../users/users.module.scss";
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

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then((d) => { setPatients(d); setLoading(false); });
  }, []);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Patients</h1>
      </div>

      {loading ? (
        <BramsLoader />
      ) : (
        <div className={styles.card}>
          <table className={styles.table}>
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
                <tr><td colSpan={7} className={styles.empty}>No patients yet. Bookings will appear here.</td></tr>
              )}
              {patients.map((p) => (
                <tr key={p.id}>
                  <td className={styles.username}>
                    {p.full_name}
                    {p.age && <span style={{ color: "#9b8fa0", marginLeft: 6 }}>· {p.age}{p.gender ? ` · ${p.gender}` : ""}</span>}
                  </td>
                  <td>{p.phone}</td>
                  <td>{p.email ?? "—"}</td>
                  <td>{p.city ?? "—"}</td>
                  <td>{p.appointment_count}</td>
                  <td>{p.last_appointment_date ? new Date(p.last_appointment_date).toLocaleDateString("en-IN") : "—"}</td>
                  <td className={styles.actions}>
                    <Link href={`/admin/patients/${p.id}`} className={styles.editBtn}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
