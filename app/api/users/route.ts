import { NextResponse } from "next/server";
import { getAllUsers, createUser } from "../../../lib/users";

export async function GET() {
  try {
    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (err) {
    console.error("[api/users GET]", err);
    return NextResponse.json({ error: "Failed to fetch users." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, email, full_name, role } = body;
    if (!username || !password || !role) {
      return NextResponse.json({ error: "username, password and role are required." }, { status: 400 });
    }
    const user = await createUser({ username, password, email: email || null, full_name: full_name || null, role });
    return NextResponse.json(user, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique")) return NextResponse.json({ error: "Username already exists." }, { status: 409 });
    console.error("[api/users POST]", err);
    return NextResponse.json({ error: "Failed to create user." }, { status: 500 });
  }
}
