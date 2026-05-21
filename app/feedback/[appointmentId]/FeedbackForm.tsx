"use client";

import { useEffect, useState } from "react";
import { trackFeedback } from "../../../lib/analytics";

type State = "loading" | "form" | "already_done" | "submitted" | "error";

export function FeedbackForm({ appointmentId }: { appointmentId: string }) {
  const [state,    setState]   = useState<State>("loading");
  const [planTitle, setPlan]  = useState("");
  const [rating,   setRating] = useState(0);
  const [hover,    setHover]  = useState(0);
  const [comments, setComments] = useState("");
  const [saving,   setSaving] = useState(false);
  const [errMsg,   setErrMsg] = useState("");

  useEffect(() => {
    fetch(`/api/feedback/${appointmentId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setState("error"); setErrMsg(d.error); return; }
        setPlan(d.appointment?.plan_title ?? "Consultation");
        if (d.feedback) setState("already_done");
        else setState("form");
      })
      .catch(() => setState("error"));
  }, [appointmentId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/feedback/${appointmentId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ rating, comments }),
      });
      if (!res.ok) throw new Error("Failed");
      trackFeedback(rating);
      setState("submitted");
    } catch {
      setErrMsg("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Shared container ────────────────────────────────────────────────────────
  const wrap = (children: React.ReactNode) => (
    <div style={{
      minHeight: "100vh", background: "#f9f9fb", display: "flex",
      alignItems: "center", justifyContent: "center", padding: "32px 16px",
      fontFamily: "-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "40px 36px",
        maxWidth: 480, width: "100%", boxShadow: "0 4px 32px rgba(116,84,117,0.08)",
        border: "1px solid rgba(207,195,204,0.3)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src="/logo.png" alt="Brams Mind Care" style={{ height: 48, marginBottom: 12 }} />
        </div>
        {children}
      </div>
    </div>
  );

  if (state === "loading") return wrap(
    <p style={{ textAlign: "center", color: "#9b8fa0" }}>Loading…</p>
  );

  if (state === "error") return wrap(
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <h2 style={{ margin: "0 0 8px", color: "#1a1c1d" }}>Link not found</h2>
      <p style={{ color: "#9b8fa0", fontSize: 14 }}>{errMsg || "This feedback link is invalid or expired."}</p>
    </div>
  );

  if (state === "already_done") return wrap(
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🙏</div>
      <h2 style={{ margin: "0 0 8px", color: "#1a1c1d" }}>Already submitted</h2>
      <p style={{ color: "#71717a", fontSize: 14 }}>You've already shared your feedback. Thank you!</p>
    </div>
  );

  if (state === "submitted") return wrap(
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>💜</div>
      <h2 style={{ margin: "0 0 10px", color: "#1a1c1d", fontSize: 22 }}>Thank you!</h2>
      <p style={{ color: "#71717a", fontSize: 15, lineHeight: 1.6 }}>
        Your feedback means a lot to Dr. Jyotika and helps improve care for everyone.
      </p>

      {/* Google review nudge */}
      <div style={{
        margin: "24px 0 0", padding: "20px", borderRadius: 14,
        background: "#f9f5f9", border: "1px solid rgba(116,84,117,0.12)",
      }}>
        <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#1a1c1d", fontSize: 15 }}>
          Loved your session?
        </p>
        <p style={{ margin: "0 0 14px", color: "#71717a", fontSize: 13, lineHeight: 1.5 }}>
          A quick Google review helps others find the right care. It only takes a minute.
        </p>
        <a
          href="https://g.page/r/CWzRmEwT8zdWEBM/review"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block", padding: "10px 22px",
            background: "#745475", color: "#fff", borderRadius: 10,
            fontSize: 14, fontWeight: 600, textDecoration: "none",
          }}
        >
          ⭐ Leave a Google Review
        </a>
      </div>

      <p style={{ color: "#9b8fa0", fontSize: 13, marginTop: 20 }}>
        Brams Mind Care · <a href="mailto:info@bramsmindcare.com" style={{ color: "#745475" }}>info@bramsmindcare.com</a>
      </p>
    </div>
  );

  return wrap(
    <form onSubmit={handleSubmit}>
      <h2 style={{ margin: "0 0 4px", color: "#1a1c1d", fontSize: 20, textAlign: "center" }}>
        How was your consultation?
      </h2>
      <p style={{ margin: "0 0 28px", color: "#71717a", fontSize: 14, textAlign: "center" }}>
        {planTitle} · Dr. Jyotika Kanwar
      </p>

      {/* Star rating */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 40, padding: 2, lineHeight: 1,
              filter: (hover || rating) >= star ? "none" : "grayscale(1) opacity(0.3)",
              transform: (hover || rating) >= star ? "scale(1.1)" : "scale(1)",
              transition: "transform 0.1s, filter 0.1s",
            }}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            ⭐
          </button>
        ))}
      </div>
      {rating > 0 && (
        <p style={{ textAlign: "center", color: "#745475", fontWeight: 700, fontSize: 14, margin: "-12px 0 20px" }}>
          {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
        </p>
      )}

      {/* Comments */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#4c444b", marginBottom: 6 }}>
          Any comments? <span style={{ fontWeight: 400, color: "#9b8fa0" }}>(optional)</span>
        </label>
        <textarea
          rows={4}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Share anything about your experience — what went well, what could improve…"
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 14,
            border: "1.5px solid rgba(207,195,204,0.6)", outline: "none",
            resize: "vertical", fontFamily: "inherit", lineHeight: 1.6,
            boxSizing: "border-box", color: "#1a1c1d",
          }}
        />
      </div>

      {errMsg && (
        <p style={{ color: "#991b1b", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{errMsg}</p>
      )}

      <button
        type="submit"
        disabled={!rating || saving}
        style={{
          width: "100%", padding: "14px 0", background: "#745475", color: "#fff",
          border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700,
          cursor: rating && !saving ? "pointer" : "not-allowed",
          opacity: !rating || saving ? 0.6 : 1, transition: "opacity 0.2s",
        }}
      >
        {saving ? "Submitting…" : "Submit Feedback"}
      </button>

      <p style={{ textAlign: "center", color: "#a1a1aa", fontSize: 12, marginTop: 16, marginBottom: 0 }}>
        Completely confidential · Takes 30 seconds
      </p>
    </form>
  );
}
