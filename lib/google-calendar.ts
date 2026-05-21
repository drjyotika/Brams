import { google } from "googleapis";

// ─── OAuth2 client ────────────────────────────────────────────────────────────

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/google/callback"
  );
}

// ─── One-time: generate the consent URL ───────────────────────────────────────

export function getAuthUrl(): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt:       "consent",          // forces refresh_token to be returned
    scope:        ["https://www.googleapis.com/auth/calendar"],
  });
}

// ─── One-time: exchange code → tokens ─────────────────────────────────────────

export async function exchangeCode(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

// ─── Create a calendar event with Google Meet ────────────────────────────────

export async function createMeetEvent({
  appointmentId,
  planTitle,
  patientName,
  patientEmail,
  scheduledDate,   // "YYYY-MM-DD"
  scheduledTime,   // "HH:MM:SS"
  durationMinutes,
}: {
  appointmentId:  string;
  planTitle:      string;
  patientName:    string;
  patientEmail?:  string | null;
  scheduledDate:  string;
  scheduledTime:  string;
  durationMinutes: number;
}): Promise<string> {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

  const calendar = google.calendar({ version: "v3", auth: client });

  // Build start/end in IST (UTC+05:30)
  const datePart = scheduledDate.slice(0, 10);
  const timePart = scheduledTime.slice(0, 5);            // "HH:MM"
  const startISO = `${datePart}T${timePart}:00+05:30`;

  const startMs  = new Date(startISO).getTime();
  const endMs    = startMs + durationMinutes * 60 * 1000;
  const endDate  = new Date(endMs);
  // Format as "YYYY-MM-DDTHH:MM:SS+05:30"
  const pad      = (n: number) => String(n).padStart(2, "0");
  const endISO   = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}` +
                   `T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00+05:30`;

  const attendees = patientEmail ? [{ email: patientEmail }] : [];

  const res = await calendar.events.insert({
    calendarId:            "primary",
    conferenceDataVersion: 1,
    sendUpdates:           patientEmail ? "all" : "none",   // sends calendar invite to patient
    requestBody: {
      summary:     `Brams Mind Care — ${planTitle}`,
      description: `Patient: ${patientName}\nConsultation with Dr. Jyotika Kanwar\nBooking ID: ${appointmentId}`,
      start:       { dateTime: startISO, timeZone: "Asia/Kolkata" },
      end:         { dateTime: endISO,   timeZone: "Asia/Kolkata" },
      attendees,
      conferenceData: {
        createRequest: {
          requestId:              `brams-${appointmentId}`,
          conferenceSolutionKey:  { type: "hangoutsMeet" },
        },
      },
    },
  });

  const meetLink = res.data.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === "video"
  )?.uri;

  if (!meetLink) throw new Error("Google did not return a Meet link.");
  return meetLink;
}
