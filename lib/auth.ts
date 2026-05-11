// Auth utilities — uses Web Crypto API only (Edge + Node.js compatible).

export const SESSION_COOKIE  = "brams_admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 24; // 24 h in seconds

// ─── HMAC helpers ────────────────────────────────────────────────────────────

function getSecret(): string {
  return process.env.AUTH_SECRET ?? "dev-only-secret-please-set-AUTH_SECRET";
}

async function hmacKey(usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  );
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuf(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}

// ─── Session token ────────────────────────────────────────────────────────────

export async function createSessionToken(): Promise<string> {
  const payload = Date.now().toString();
  const key     = await hmacKey("sign");
  const sig     = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(JSON.stringify({ p: payload, s: bufToHex(sig) }));
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const { p, s } = JSON.parse(atob(token)) as { p: string; s: string };
    const key      = await hmacKey("verify");
    const valid    = await crypto.subtle.verify(
      "HMAC",
      key,
      hexToBuf(s),
      new TextEncoder().encode(p)
    );
    if (!valid) return false;
    // Reject tokens older than 24 h
    return Date.now() - parseInt(p, 10) < SESSION_MAX_AGE * 1000;
  } catch {
    return false;
  }
}

// ─── Credential check ─────────────────────────────────────────────────────────

export function verifyCredentials(username: string, password: string): boolean {
  const validUser = process.env.ADMIN_USERNAME ?? "admin";
  const validPass = process.env.ADMIN_PASSWORD ?? "";
  return username === validUser && password === validPass;
}
