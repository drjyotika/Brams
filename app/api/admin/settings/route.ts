import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "../../../../lib/auth";
import { getEmailSettings, updateEmailSettings } from "../../../../lib/settings";

async function requireAdmin() {
  const jar   = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : false;
}

/** GET /api/admin/settings — returns current email settings */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await getEmailSettings();
  return NextResponse.json(settings);
}

/** PUT /api/admin/settings — saves updated email settings */
export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json() as {
      fromEmail?:    string;
      replyToEmail?: string;
      clinicEmail?:  string;
      doctorEmail?:  string;
    };

    await updateEmailSettings(body);
    const updated = await getEmailSettings();
    return NextResponse.json({ ok: true, settings: updated });
  } catch (e) {
    console.error("[admin/settings] PUT failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
