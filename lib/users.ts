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

export type PublicUser = Omit<User, "password_hash">;

// ─── Password helpers ─────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const derived = crypto.scryptSync(plain, salt, 64);
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), derived);
  } catch {
    return false;
  }
}

// ─── Auth queries ─────────────────────────────────────────────────────────────

export async function findUserByUsername(username: string): Promise<User | null> {
  const rows = await sql`
    SELECT * FROM users WHERE username = ${username} AND is_active = true LIMIT 1
  `;
  return (rows[0] as User) ?? null;
}

export async function recordLogin(id: string): Promise<void> {
  await sql`
    UPDATE users SET last_login_at = NOW(), failed_login_count = 0,
      locked_until = NULL, updated_at = NOW() WHERE id = ${id}
  `;
}

export async function recordFailedLogin(id: string): Promise<void> {
  await sql`
    UPDATE users
    SET failed_login_count = failed_login_count + 1,
        locked_until = CASE WHEN failed_login_count + 1 >= 5
          THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END,
        updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function isAccountLocked(user: User): Promise<boolean> {
  if (!user.locked_until) return false;
  return new Date(user.locked_until) > new Date();
}

// ─── CRUD queries ─────────────────────────────────────────────────────────────

export async function getAllUsers(): Promise<PublicUser[]> {
  const rows = await sql`
    SELECT id, username, email, full_name, role, is_active,
           created_at, updated_at, last_login_at, failed_login_count, locked_until
    FROM users ORDER BY created_at ASC
  `;
  return rows as PublicUser[];
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const rows = await sql`
    SELECT id, username, email, full_name, role, is_active,
           created_at, updated_at, last_login_at, failed_login_count, locked_until
    FROM users WHERE id = ${id} LIMIT 1
  `;
  return (rows[0] as PublicUser) ?? null;
}

export type CreateUserInput = {
  username: string;
  password: string;
  email?: string | null;
  full_name?: string | null;
  role: UserRole;
};

export async function createUser(data: CreateUserInput): Promise<PublicUser> {
  const hash = hashPassword(data.password);
  const rows = await sql`
    INSERT INTO users (username, password_hash, email, full_name, role)
    VALUES (${data.username}, ${hash}, ${data.email ?? null}, ${data.full_name ?? null}, ${data.role})
    RETURNING id, username, email, full_name, role, is_active,
              created_at, updated_at, last_login_at, failed_login_count, locked_until
  `;
  return rows[0] as PublicUser;
}

export type UpdateUserInput = {
  username?:   string;
  password?:   string;
  email?:      string | null;
  full_name?:  string | null;
  role?:       UserRole;
  is_active?:  boolean;
};

export async function updateUser(id: string, data: UpdateUserInput): Promise<void> {
  if (data.password) {
    const hash = hashPassword(data.password);
    await sql`UPDATE users SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${id}`;
  }
  await sql`
    UPDATE users SET
      username  = COALESCE(${data.username  ?? null}, username),
      email     = COALESCE(${data.email     ?? null}, email),
      full_name = COALESCE(${data.full_name ?? null}, full_name),
      role      = COALESCE(${data.role      ?? null}, role),
      is_active = COALESCE(${data.is_active ?? null}, is_active),
      updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function deleteUser(id: string): Promise<void> {
  await sql`DELETE FROM users WHERE id = ${id}`;
}
