"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./users.module.scss";

type User = {
  id: string;
  username: string;
  email: string | null;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => { setUsers(d); setLoading(false); });
  };

  useEffect(load, []);

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Users</h1>
        <Link href="/admin/users/create" className={styles.createBtn}>+ Create User</Link>
      </div>

      {loading ? (
        <p className={styles.loading}>Loading…</p>
      ) : (
        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={6} className={styles.empty}>No users found.</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id}>
                  <td className={styles.username}>{u.username}</td>
                  <td>{u.full_name ?? "—"}</td>
                  <td><span className={styles.roleBadge}>{u.role}</span></td>
                  <td><span className={u.is_active ? styles.active : styles.inactive}>{u.is_active ? "Active" : "Inactive"}</span></td>
                  <td>{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString("en-IN") : "—"}</td>
                  <td className={styles.actions}>
                    <Link href={`/admin/users/${u.id}`} className={styles.editBtn}>Edit</Link>
                    <button className={styles.deleteBtn} onClick={() => remove(u.id, u.username)}>Delete</button>
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
