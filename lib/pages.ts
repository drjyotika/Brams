import { sql } from "./db";

export type Page = {
  slug: string;
  title: string;
  content: string;
  updated_at: Date;
};

const DB_TIMEOUT_MS = 8_000;

export async function getPage(slug: string): Promise<Page | null> {
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("DB timeout")), DB_TIMEOUT_MS)
    );
    const query = sql`SELECT * FROM pages WHERE slug = ${slug} LIMIT 1`;
    const rows = await Promise.race([query, timeout]);
    return (rows[0] as Page) ?? null;
  } catch (err) {
    // Don't crash the page render if the DB is unreachable (e.g. local dev
    // behind a VPN that intercepts Neon's HTTPS). The legal pages then fall
    // back to the parser's default content.
    console.error(`[pages] getPage(${slug}) failed:`, err);
    return null;
  }
}

export async function getAllPages(): Promise<Page[]> {
  const rows = await sql`SELECT slug, title, updated_at FROM pages ORDER BY slug`;
  return rows as Page[];
}

export async function updatePage(slug: string, content: string): Promise<void> {
  await sql`
    UPDATE pages SET content = ${content}, updated_at = NOW()
    WHERE slug = ${slug}
  `;
}
