"use client";

import { useEffect, useState } from "react";
import styles from "./coupons.module.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

type DiscountType = "percent" | "fixed";

type Coupon = {
  id:               string;
  code:             string;
  description:      string | null;
  discount_type:    DiscountType;
  discount_value:   number;
  min_amount_paise: number;
  max_uses:         number | null;
  used_count:       number;
  valid_from:       string | null;
  valid_until:      string | null;
  is_active:        boolean;
  plan_ids:         string[];
  created_at:       string;
  updated_at:       string;
};

type Plan = { id: string; title: string };

type FormState = {
  code:            string;
  description:     string;
  discount_type:   DiscountType;
  discount_value:  string;
  min_amount_inr:  string;
  max_uses:        string;
  valid_from:      string;
  valid_until:     string;
  is_active:       boolean;
  plan_ids:        string[]; // empty = valid for every plan
};

const EMPTY_FORM: FormState = {
  code:           "",
  description:    "",
  discount_type:  "percent",
  discount_value: "",
  min_amount_inr: "",
  max_uses:       "",
  valid_from:     "",
  valid_until:    "",
  is_active:      true,
  plan_ids:       [],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function couponToForm(c: Coupon): FormState {
  return {
    code:           c.code,
    description:    c.description ?? "",
    discount_type:  c.discount_type,
    discount_value: String(c.discount_value),
    min_amount_inr: c.min_amount_paise > 0 ? String(c.min_amount_paise / 100) : "",
    max_uses:       c.max_uses != null ? String(c.max_uses) : "",
    valid_from:     c.valid_from ? c.valid_from.slice(0, 10) : "",
    valid_until:    c.valid_until ? c.valid_until.slice(0, 10) : "",
    is_active:      c.is_active,
    plan_ids:       c.plan_ids ?? [],
  };
}

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CouponsPage() {
  const [coupons,    setCoupons]    = useState<Coupon[]>([]);
  const [plans,      setPlans]      = useState<Plan[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  // Modal state
  const [open,       setOpen]       = useState(false);
  const [editing,    setEditing]    = useState<Coupon | null>(null);
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState<string | null>(null);

  // Delete confirm
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [deleting,   setDeleting]   = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/coupons");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCoupons(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    fetch("/api/plans")
      .then((r) => r.json())
      .then((p) => setPlans(Array.isArray(p) ? p.map((pl) => ({ id: pl.id, title: pl.title })) : []))
      .catch(() => {});
  }, []);

  function togglePlan(planId: string) {
    setForm((f) => ({
      ...f,
      plan_ids: f.plan_ids.includes(planId)
        ? f.plan_ids.filter((id) => id !== planId)
        : [...f.plan_ids, planId],
    }));
  }

  // ── Open modal ─────────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setOpen(true);
  }

  function openEdit(c: Coupon) {
    setEditing(c);
    setForm(couponToForm(c));
    setFormError(null);
    setOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setOpen(false);
    setEditing(null);
    setFormError(null);
  }

  // ── Form field helper ──────────────────────────────────────────────────────

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // ── Save (create or update) ────────────────────────────────────────────────

  async function save() {
    setFormError(null);
    const code = form.code.trim().toUpperCase();
    if (!code) { setFormError("Coupon code is required."); return; }
    const dv = parseFloat(form.discount_value);
    if (!form.discount_value || isNaN(dv) || dv <= 0) {
      setFormError("Discount value must be a positive number."); return;
    }
    if (form.discount_type === "percent" && dv > 100) {
      setFormError("Percent discount cannot exceed 100."); return;
    }

    setSaving(true);
    try {
      const body = {
        code,
        description:    form.description.trim() || null,
        discount_type:  form.discount_type,
        discount_value: dv,
        min_amount_inr: form.min_amount_inr ? parseFloat(form.min_amount_inr) : 0,
        max_uses:       form.max_uses ? parseInt(form.max_uses, 10) : null,
        valid_from:     form.valid_from || null,
        valid_until:    form.valid_until || null,
        is_active:      form.is_active,
        plan_ids:       form.plan_ids,
      };

      let res: Response;
      if (editing) {
        res = await fetch(`/api/admin/coupons/${editing.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/admin/coupons", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
      }

      const data = await res.json();
      if (!res.ok) { setFormError(data.error || "Save failed."); return; }

      setOpen(false);
      await load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/coupons/${deleteId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Delete failed.");
      } else {
        await load();
      }
    } finally {
      setDeleteId(null);
      setDeleting(false);
    }
  }

  // ── Toggle active ──────────────────────────────────────────────────────────

  async function toggleActive(c: Coupon) {
    try {
      await fetch(`/api/admin/coupons/${c.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !c.is_active }),
      });
      await load();
    } catch { /* silent */ }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Coupon Codes</h1>
          <p className={styles.subtitle}>Create and manage discount coupons for bookings.</p>
        </div>
        <button className={styles.createBtn} onClick={openCreate}>+ New Coupon</button>
      </div>

      {error && <p className={styles.pageError}>{error}</p>}

      {loading ? (
        <p className={styles.loading}>Loading…</p>
      ) : coupons.length === 0 ? (
        <div className={styles.empty}>
          <p>No coupons yet.</p>
          <button className={styles.createBtn} onClick={openCreate}>Create your first coupon</button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Plans</th>
                <th>Min. Order</th>
                <th>Uses</th>
                <th>Valid From</th>
                <th>Valid Until</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const expired = c.valid_until && new Date(c.valid_until) < new Date();
                const exhausted = c.max_uses != null && c.used_count >= c.max_uses;
                const effectiveStatus = !c.is_active ? "inactive" : expired ? "expired" : exhausted ? "exhausted" : "active";
                const planLabel = c.plan_ids.length === 0
                  ? "All plans"
                  : c.plan_ids.map((id) => plans.find((p) => p.id === id)?.title ?? id).join(", ");
                return (
                  <tr key={c.id}>
                    <td>
                      <span className={styles.code}>{c.code}</span>
                      {c.description && <span className={styles.desc}>{c.description}</span>}
                    </td>
                    <td>
                      {c.discount_type === "percent"
                        ? `${c.discount_value}% off`
                        : `${fmt(c.discount_value)} off`}
                    </td>
                    <td className={styles.planCell}>{planLabel}</td>
                    <td>{c.min_amount_paise > 0 ? fmt(c.min_amount_paise) : "—"}</td>
                    <td>
                      {c.used_count}
                      {c.max_uses != null ? ` / ${c.max_uses}` : ""}
                    </td>
                    <td>{fmtDate(c.valid_from)}</td>
                    <td>{fmtDate(c.valid_until)}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[effectiveStatus]}`}>
                        {effectiveStatus}
                      </span>
                    </td>
                    <td className={styles.actions}>
                      <button className={styles.editBtn} onClick={() => openEdit(c)}>Edit</button>
                      <button
                        className={`${styles.toggleBtn} ${c.is_active ? styles.deactivate : styles.activate}`}
                        onClick={() => toggleActive(c)}
                      >
                        {c.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button className={styles.deleteBtn} onClick={() => setDeleteId(c.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit Modal ───────────────────────────────────────────── */}
      {open && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editing ? "Edit Coupon" : "New Coupon"}</h2>
              <button className={styles.modalClose} onClick={closeModal} disabled={saving}>✕</button>
            </div>

            <div className={styles.modalBody}>
              {/* Code */}
              <label className={styles.label}>
                Coupon Code <span className={styles.req}>*</span>
                <input
                  className={styles.input}
                  placeholder="e.g. WELCOME20"
                  value={form.code}
                  onChange={(e) => field("code", e.target.value.toUpperCase())}
                  maxLength={30}
                  style={{ textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}
                />
              </label>

              {/* Description */}
              <label className={styles.label}>
                Description
                <input
                  className={styles.input}
                  placeholder="Internal note (optional)"
                  value={form.description}
                  onChange={(e) => field("description", e.target.value)}
                  maxLength={200}
                />
              </label>

              {/* Discount type + value */}
              <div className={styles.row2}>
                <label className={styles.label}>
                  Discount Type <span className={styles.req}>*</span>
                  <select
                    className={styles.select}
                    value={form.discount_type}
                    onChange={(e) => field("discount_type", e.target.value as DiscountType)}
                  >
                    <option value="percent">Percent (%)</option>
                    <option value="fixed">Fixed (₹)</option>
                  </select>
                </label>

                <label className={styles.label}>
                  {form.discount_type === "percent" ? "Percentage" : "Amount (₹)"} <span className={styles.req}>*</span>
                  <input
                    className={styles.input}
                    type="number"
                    min="1"
                    max={form.discount_type === "percent" ? 100 : undefined}
                    step={form.discount_type === "percent" ? 1 : 0.01}
                    placeholder={form.discount_type === "percent" ? "e.g. 20" : "e.g. 500"}
                    value={form.discount_value}
                    onChange={(e) => field("discount_value", e.target.value)}
                  />
                </label>
              </div>

              {/* Min amount + max uses */}
              <div className={styles.row2}>
                <label className={styles.label}>
                  Min. Order (₹)
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="No minimum"
                    value={form.min_amount_inr}
                    onChange={(e) => field("min_amount_inr", e.target.value)}
                  />
                </label>

                <label className={styles.label}>
                  Max Uses
                  <input
                    className={styles.input}
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Unlimited"
                    value={form.max_uses}
                    onChange={(e) => field("max_uses", e.target.value)}
                  />
                </label>
              </div>

              {/* Valid from / until */}
              <div className={styles.row2}>
                <label className={styles.label}>
                  Valid From
                  <input
                    className={styles.input}
                    type="date"
                    value={form.valid_from}
                    onChange={(e) => field("valid_from", e.target.value)}
                  />
                </label>

                <label className={styles.label}>
                  Valid Until
                  <input
                    className={styles.input}
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => field("valid_until", e.target.value)}
                  />
                </label>
              </div>

              {/* Applicable plans */}
              <label className={styles.label}>
                Applicable Plans
                <span className={styles.planHint}>
                  {form.plan_ids.length === 0
                    ? "Leave all unchecked to allow this coupon on every consultation plan."
                    : "Only checked plans can use this coupon."}
                </span>
                <div className={styles.planCheckboxes}>
                  {plans.map((p) => (
                    <label key={p.id} className={styles.checkLabel}>
                      <input
                        type="checkbox"
                        checked={form.plan_ids.includes(p.id)}
                        onChange={() => togglePlan(p.id)}
                      />
                      {p.title}
                    </label>
                  ))}
                </div>
              </label>

              {/* Active toggle */}
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => field("is_active", e.target.checked)}
                />
                Active (coupon can be used immediately)
              </label>

              {formError && <p className={styles.formError}>{formError}</p>}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button className={styles.saveBtn} onClick={save} disabled={saving}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Coupon"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ────────────────────────────────────────────────── */}
      {deleteId && (
        <div className={styles.overlay} onClick={() => !deleting && setDeleteId(null)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>Delete coupon?</h3>
            <p className={styles.confirmText}>
              This will permanently delete the coupon. Existing appointments that used it
              will keep their discount. This action cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteId(null)} disabled={deleting}>
                Cancel
              </button>
              <button className={styles.deleteConfirmBtn} onClick={confirmDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
