// Brams Mind Care — Email Service
// ─────────────────────────────────
// Tiny HTTP wrapper around nodemailer.  The Next.js app POSTs to /send and
// this service relays the message through whatever SMTP server you point it
// at (your domain's mailbox, Google Workspace, Zoho, etc.) so the mail is
// delivered "From: Brams Mind Care <verification@bramsmindcare.com>".
//
// Endpoints
//   GET  /health  — pings the SMTP server (no auth needed)
//   POST /send    — { to, subject, html?, text?, replyTo? } (Bearer auth)
//
// Run locally:
//   cp .env.example .env  &&  edit  &&  npm install  &&  npm run dev

import express from "express";
import nodemailer from "nodemailer";

const {
  PORT                  = "4000",
  SMTP_HOST,
  SMTP_PORT             = "587",
  SMTP_SECURE           = "false",       // "true" for port 465 (implicit TLS)
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM            = "Brams Mind Care <verification@bramsmindcare.com>",
  EMAIL_REPLY_TO,                        // optional default reply-to
  EMAIL_SERVICE_TOKEN,                   // shared secret with the Next.js app
} = process.env;

// ─── Validate config up-front ────────────────────────────────────────────────

const required = { SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_SERVICE_TOKEN };
for (const [k, v] of Object.entries(required)) {
  if (!v) {
    console.error(`✖  Missing env var: ${k}`);
    process.exit(1);
  }
}

// ─── Transporter ─────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host:   SMTP_HOST,
  port:   Number(SMTP_PORT),
  secure: SMTP_SECURE === "true",
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// Verify on boot — fail fast if creds are bad
transporter
  .verify()
  .then(() => console.log(`✔  SMTP connection OK (${SMTP_HOST}:${SMTP_PORT})`))
  .catch((err) => console.error(`⚠  SMTP verify failed: ${err.message}`));

// ─── Server ──────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json({ limit: "1mb" }));

// Health check — handy for uptime probes; no auth so it's reachable from
// a load balancer or status page.
app.get("/health", async (_req, res) => {
  try {
    await transporter.verify();
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

// Bearer-token auth for everything else
app.use((req, res, next) => {
  const header = req.headers.authorization ?? "";
  if (header !== `Bearer ${EMAIL_SERVICE_TOKEN}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

// POST /send
app.post("/send", async (req, res) => {
  const { to, subject, html, text, replyTo, cc, bcc } = req.body ?? {};

  if (!to || !subject || (!html && !text)) {
    return res
      .status(400)
      .json({ error: "`to`, `subject`, and one of `html`/`text` are required." });
  }

  try {
    const info = await transporter.sendMail({
      from:    EMAIL_FROM,
      to,
      subject,
      html,
      text,
      cc,
      bcc,
      replyTo: replyTo ?? EMAIL_REPLY_TO,
    });

    console.log(`📧  ${info.messageId} → ${Array.isArray(to) ? to.join(", ") : to}`);
    res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error("✖  Send failed:", err);
    res.status(502).json({ error: err.message });
  }
});

// Friendly 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

app.listen(Number(PORT), () => {
  console.log(`🚀  Email service listening on http://localhost:${PORT}`);
  console.log(`    From:  ${EMAIL_FROM}`);
});
