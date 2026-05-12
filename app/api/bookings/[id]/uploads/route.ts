import { NextRequest, NextResponse } from "next/server";
import {
  addAppointmentUpload,
  getAppointmentById,
  getUploadsForAppointment,
} from "../../../../../lib/bookings";
import {
  uploadPrescription,
  getPresignedUrl,
  keyToUri,
  uriToKey,
} from "../../../../../lib/s3";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/bookings/[id]/uploads
// Returns all uploads for the appointment; S3-stored files get a fresh
// pre-signed download URL (valid 1 hour) injected as `signed_url`.
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const uploads = await getUploadsForAppointment(id);

  // Enrich S3 entries with a fresh presigned URL
  const enriched = await Promise.all(
    uploads.map(async (u) => {
      const s3Key = uriToKey(u.file_url);
      if (!s3Key) return u;                          // legacy Vercel Blob URL — return as-is
      try {
        const signed_url = await getPresignedUrl(s3Key, 3600);
        return { ...u, signed_url };
      } catch {
        return u;                                    // presign failed — still return the record
      }
    }),
  );

  return NextResponse.json(enriched);
}

// POST /api/bookings/[id]/uploads
// Accepts a single file in FormData (field name: "file").
// Call multiple times to upload multiple files.
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

    // ── Upload to S3 ─────────────────────────────────────────────────────────
    const body = new Uint8Array(await file.arrayBuffer());

    const s3Key = await uploadPrescription({
      patientId:   appointment.patient_id,
      date:        appointment.scheduled_date,   // YYYY-MM-DD
      fileName:    file.name,
      body,
      contentType: file.type || "application/octet-stream",
    });

    // Store as `s3://bucket/key` so we can detect and presign later
    const fileUri = keyToUri(s3Key);

    // ── Persist to DB ─────────────────────────────────────────────────────────
    const upload = await addAppointmentUpload({
      appointment_id: id,
      file_name:      file.name,
      file_url:       fileUri,          // s3://brams-s3-prescriptions/prescriptions/…
      file_size:      file.size,
      mime_type:      file.type || null,
    });

    // Return the record + a fresh presigned URL so the caller can confirm
    const signed_url = await getPresignedUrl(s3Key, 3600);
    return NextResponse.json({ ...upload, signed_url });
  } catch (e) {
    console.error("[uploads] POST failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
