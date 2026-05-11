import { NextResponse } from "next/server";
import { getUserById, updateUser, deleteUser } from "../../../../lib/users";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserById(id);
    if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json(user);
  } catch (err) {
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    await updateUser(id, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/users PUT]", err);
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/users DELETE]", err);
    return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
  }
}
