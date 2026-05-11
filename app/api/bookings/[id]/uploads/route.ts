import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import {
  addAppointmentUpload,
  getAppointmentById,
  getUploadsForAppointment,
} from "../../../../../lib/bookings";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/bookings/[id]/uploads
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const uploads = await getUploadsForAppointment(id);
  return NextResponse.json(uploads);
}

// POST /api/bookings/[id]/uploads
// FormData: file (one file at a time — call multiple times for multiple files)
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const appointment = await getAppointmentById(id);
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN not configured" },
        { status: 500 },
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const pathname = `bookings/${id}/${Date.now()}-${safeName}`;
    const blob = await put(pathname, file, {
      access: "public",
      token,
      contentType: file.type || "application/octet-stream",
    });

    const upload = await addAppointmentUpload({
      appointment_id: id,
      file_name:      file.name,
      file_url:       blob.url,
      file_size:      file.size,
      mime_type:      file.type || null,
    });

    return NextResponse.json(upload);
  } catch (e) {
    console.error("[uploads] POST failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
