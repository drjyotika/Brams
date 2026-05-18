import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PATIENT_SESSION_COOKIE, verifyPatientToken } from "../../../../lib/auth";
import { getUploadsForPatient } from "../../../../lib/bookings";
import { getPresignedUrl, uriToKey } from "../../../../lib/s3";

/**
 * GET /api/patient/reports
 * Returns all uploads/reports for the logged-in patient across all appointments,
 * each with a fresh 1-hour presigned download URL.
 */
export async function GET() {
  try {
    const jar   = await cookies();
    const token = jar.get(PATIENT_SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const patientId = await verifyPatientToken(token);
    if (!patientId) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

    const uploads = await getUploadsForPatient(patientId);

    const enriched = await Promise.all(
      uploads.map(async (u) => {
        const s3Key = uriToKey(u.file_url);
        if (!s3Key) return { ...u, signed_url: u.file_url };
        try {
          const signed_url = await getPresignedUrl(s3Key, 3600);
          return { ...u, signed_url };
        } catch {
          return { ...u, signed_url: null };
        }
      }),
    );

    return NextResponse.json(enriched);
  } catch (e) {
    console.error("[patient/reports]", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
