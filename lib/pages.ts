import { sql } from "./db";

export type Page = {
  slug: string;
  title: string;
  content: string;
  updated_at: Date;
};

export async function getPage(slug: string): Promise<Page | null> {
  const rows = await sql`SELECT * FROM pages WHERE slug = ${slug} LIMIT 1`;
  return (rows[0] as Page) ?? null;
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
