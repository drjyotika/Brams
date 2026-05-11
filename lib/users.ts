import crypto from "node:crypto";
import { sql } from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "editor";

export type User = {
  id:                  string;
  username:            string;
  password_hash:       string;
  email:               string | null;
  full_name:           string | null;
  role:                UserRole;
  is_active:           boolean;
  created_at:          Date;
  updated_at:          Date;
  last_login_at:       Date | null;
  failed_login_count:  number;
  locked_until:        Date | null;
};

// ─── Password helpers ─────────────────────────────────────────────────────────

/** Hash a plain-text password with scrypt + random salt. */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Timing-safe comparison against a stored hash created by hashPassword(). */
export function verifyPassword(plain: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const derived = crypto.scryptSync(plain, salt, 64);
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), derived);
  } catch {
    return false;
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findUserByUsername(username: string): Promise<User | null> {
  const rows = await sql`
    SELECT * FROM users
    WHERE username = ${username}
      AND is_active = true
    LIMIT 1
  `;
  return (rows[0] as User) ?? null;
}

export async function recordLogin(id: string): Promise<void> {
  await sql`
    UPDATE users
    SET last_login_at      = NOW(),
        failed_login_count = 0,
        locked_until       = NULL,
        updated_at         = NOW()
    WHERE id = ${id}
  `;
}

export async function recordFailedLogin(id: string): Promise<void> {
  // Lock account for 15 minutes after 5 consecutive failures.
  await sql`
    UPDATE users
    SET failed_login_count = failed_login_count + 1,
        locked_until = CASE
          WHEN failed_login_count + 1 >= 5
          THEN NOW() + INTERVAL '15 minutes'
          ELSE locked_until
        END,
        updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function isAccountLocked(user: User): Promise<boolean> {
  if (!user.locked_until) return false;
  return new Date(user.locked_until) > new Date();
}
