# Brams Email Service

Tiny stand-alone Node.js microservice that sends mail on behalf of the main
Next.js app. Lives in its own folder so it can run on a different host, have
its own deploy lifecycle, and keep SMTP credentials out of the web tier.

```
  Patient registers         Next.js app           This service          SMTP server         Inbox
   ───────────►   /api/patient/   ───►   POST /send   ───►   smtp.…    ───►   👤
                auth/register        (Bearer auth)        (verification@
                                                          bramsmindcare.com)
```

The service is **dumb on purpose**: it doesn't know what a "verification
email" is. The Next.js app composes the HTML/text and POSTs the finished
message. That keeps templates next to the rest of the product code while
this service stays a generic SMTP relay you'd never have to touch again.

---

## 1. Configure

```bash
cd services/email
cp .env.example .env
# fill in SMTP_* values and a long random EMAIL_SERVICE_TOKEN
```

### Where do `SMTP_*` come from?

You need an SMTP server that knows the mailbox **`verification@bramsmindcare.com`** and is allowed to send as that address. Common setups:

| Provider             | `SMTP_HOST`              | Port | `SMTP_SECURE` | Auth                                  |
| -------------------- | ------------------------ | ---- | ------------- | ------------------------------------- |
| Google Workspace     | `smtp.gmail.com`         | 587  | `false`       | the mailbox + a **16-char App Pwd**   |
| Zoho Mail            | `smtp.zoho.in` / `.com`  | 587  | `false`       | mailbox + Zoho App Password           |
| Microsoft 365        | `smtp.office365.com`     | 587  | `false`       | mailbox + password (modern auth)      |
| cPanel / Hostinger   | `mail.bramsmindcare.com` | 465  | `true`        | mailbox + password                    |
| AWS SES (SMTP iface) | `email-smtp.<region>...` | 587  | `false`       | SES SMTP user (not your IAM creds)    |

Whatever you pick, the **From address** has to be authorised — otherwise the server will refuse or the mail will land in spam. Make sure SPF / DKIM / DMARC records for `bramsmindcare.com` exist (your DNS host has a guide).

### Generate the shared token

```bash
openssl rand -hex 32
```

Put the result in **both** `services/email/.env` (`EMAIL_SERVICE_TOKEN`) and the Next.js project's `.env.local` (`EMAIL_SERVICE_TOKEN`). The two values must match.

---

## 2. Run

```bash
cd services/email
npm install
npm run dev          # auto-reload via --watch
# or
npm start            # plain start
```

You should see:

```
✔  SMTP connection OK (smtp.gmail.com:587)
🚀  Email service listening on http://localhost:4000
    From:  Brams Mind Care <verification@bramsmindcare.com>
```

### Smoke test

```bash
# Health check — no auth required
curl http://localhost:4000/health

# Send a one-off message
curl -X POST http://localhost:4000/send \
  -H "Authorization: Bearer $EMAIL_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "you@example.com",
    "subject": "Hello from Brams",
    "text": "It works.",
    "html": "<p>It <strong>works</strong>.</p>"
  }'
```

---

## 3. Wire it into the Next.js app

In the **Next.js project's** `.env.local`:

```
EMAIL_SERVICE_URL=http://localhost:4000
EMAIL_SERVICE_TOKEN=<same token you set above>
```

In production, replace the URL with wherever you deploy this service (Railway, Render, Fly.io, a VPS, etc.).

The Next.js app's `lib/email.ts` will automatically POST `/send` whenever it needs to send a verification email or any other transactional mail. If `EMAIL_SERVICE_URL` is empty the app falls back to console-logging the message (helpful for dev when you don't want to run the service).

---

## 4. Deploy

The service is a plain Node 20+ Express app and runs anywhere:

- **Railway / Render / Fly.io** — point them at this folder, set the env vars, that's it.
- **Vercel** — works as a "Other" / Node deployment, but Vercel is overkill for a single endpoint; their serverless model also means SMTP keep-alive doesn't help.
- **VPS** — `pm2 start npm -- start` (or `systemd`) and reverse-proxy via nginx.

Whatever you use, lock the port behind HTTPS and keep `EMAIL_SERVICE_TOKEN` secret.

---

## 5. API reference

### `GET /health`
Unauthenticated. Returns `{ ok: true }` when the SMTP server accepts a `VRFY`/`AUTH` round-trip; `503` otherwise.

### `POST /send`
Bearer-authenticated. Body:

| Field      | Type          | Required | Notes                                  |
| ---------- | ------------- | -------- | -------------------------------------- |
| `to`       | string \| str[] | ✓      | Recipient(s).                          |
| `subject`  | string        | ✓        |                                        |
| `html`     | string        | one of html/text |                            |
| `text`     | string        | one of html/text | Plain-text fallback.            |
| `cc`       | string \| str[] |       |                                        |
| `bcc`      | string \| str[] |       |                                        |
| `replyTo`  | string        |          | Overrides `EMAIL_REPLY_TO` for this msg.|

Responses: `200 { ok, messageId }` · `400 { error }` · `401 { error }` · `502 { error }`.
