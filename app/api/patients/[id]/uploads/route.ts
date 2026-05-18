import { NextRequest, NextResponse } from "next/server";
import { getUploadsForPatient } from "../../../../../lib/bookings";
import { getPresignedUrl, uriToKey } from "../../../../../lib/s3";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/patients/[id]/uploads
// Returns all uploads across every appointment for this patient,
// each enriched with a fresh 1-hour presigned S3 download URL.
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const uploads = await getUploadsForPatient(id);

    const enriched = await Promise.all(
      uploads.map(async (u) => {
        const s3Key = uriToKey(u.file_url);
        if (!s3Key) return { ...u, signed_url: u.file_url }; // legacy blob URL
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
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
