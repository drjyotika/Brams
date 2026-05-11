import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

export async function POST(req: Request) {
  try {
    const { name, email, phone, subject, message } = await req.json();
    if (!name || !email || !message) {
      return NextResponse.json({ error: "name, email and message are required." }, { status: 400 });
    }
    await sql`
      INSERT INTO contact_submissions (name, email, phone, subject, message)
      VALUES (${name}, ${email}, ${phone ?? null}, ${subject ?? null}, ${message})
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/contact POST]", err);
    return NextResponse.json({ error: "Failed to submit." }, { status: 500 });
  }
}
