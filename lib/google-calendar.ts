import { google } from "googleapis";
import { sql } from "./db";
import { getAppointmentById, getPatientById } from "./bookings";

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

// ─── Time window (IST) ───────────────────────────────────────────────────────

/**
 * Builds `{ startISO, endISO }` for an appointment, both anchored to IST
 * (UTC+05:30). Computed via epoch math + a fixed IST offset so the end time is
 * correct regardless of the server's own timezone (Vercel runs in UTC).
 */
function eventWindow(
  scheduledDate: string,
  scheduledTime: string,
  durationMinutes: number,
): { startISO: string; endISO: string } {
  const dateStr  = typeof scheduledDate === "string" ? scheduledDate : (scheduledDate as unknown as Date).toISOString();
  const timeStr  = typeof scheduledTime === "string" ? scheduledTime : String(scheduledTime);
  const datePart = dateStr.slice(0, 10);
  const timePart = timeStr.slice(0, 5);                 // "HH:MM"
  const startISO = `${datePart}T${timePart}:00+05:30`;

  const pad = (n: number) => String(n).padStart(2, "0");
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  // Shift the epoch by the IST offset so UTC getters read the IST wall clock.
  const end = new Date(new Date(startISO).getTime() + durationMinutes * 60_000 + IST_OFFSET_MS);
  const endISO =
    `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}` +
    `T${pad(end.getUTCHours())}:${pad(end.getUTCMinutes())}:00+05:30`;

  return { startISO, endISO };
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

  const { startISO, endISO } = eventWindow(scheduledDate, scheduledTime, durationMinutes);
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
      // Tag the event with the appointment id so it can be located and moved
      // later (e.g. on reschedule) without storing the Google event id.
      extendedProperties: { private: { appointmentId } },
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

// ─── Ensure an appointment has a Meet link ───────────────────────────────────

/**
 * Idempotently ensures an upcoming appointment has a Google Meet link,
 * generating one on the clinic calendar (drjyotika@bramsmindcare.com's primary,
 * via GOOGLE_REFRESH_TOKEN) when none exists yet, and persisting it.
 *
 * Non-throwing: returns { meetLink, error } so callers (payment confirmation,
 * status change, manual admin action) can proceed even if Google fails — the
 * booking must never break because Meet generation hiccuped.
 */
export async function ensureMeetLinkForAppointment(
  appointmentId: string,
): Promise<{ meetLink: string | null; error: string | null }> {
  try {
    const appt = await getAppointmentById(appointmentId);
    if (!appt) return { meetLink: null, error: "Appointment not found." };
    if (appt.meeting_link) return { meetLink: appt.meeting_link, error: null };

    const patient = await getPatientById(appt.patient_id);
    if (!patient) return { meetLink: null, error: "Patient not found." };

    const meetLink = await createMeetEvent({
      appointmentId:   appt.id,
      planTitle:       appt.plan_title,
      patientName:     patient.full_name,
      patientEmail:    patient.email,
      scheduledDate:   appt.scheduled_date,
      scheduledTime:   appt.scheduled_time,
      durationMinutes: appt.duration_minutes ?? 60,
    });

    await sql`UPDATE appointments SET meeting_link = ${meetLink}, updated_at = NOW() WHERE id = ${appointmentId}`;
    return { meetLink, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ensureMeetLinkForAppointment]", err);
    return { meetLink: null, error: msg };
  }
}

// ─── Move an appointment's Meet event to a new time (reschedule) ──────────────

/**
 * Moves the existing Google Meet/calendar event to the appointment's current
 * (rescheduled) date/time, keeping the SAME Meet link so the patient's existing
 * link still works, and re-sending the calendar invite so they see the new time.
 *
 * Finds the event via the `appointmentId` extended property (no stored event
 * id needed). If no event is found — e.g. an appointment created before events
 * were tagged, or the link was cleared — it generates a fresh one for the new
 * time. Non-throwing: returns { meetLink, error }.
 */
export async function rescheduleMeetEventForAppointment(
  appointmentId: string,
): Promise<{ meetLink: string | null; error: string | null }> {
  const appt = await getAppointmentById(appointmentId);
  if (!appt) return { meetLink: null, error: "Appointment not found." };
  const patient = await getPatientById(appt.patient_id);
  if (!patient) return { meetLink: null, error: "Patient not found." };

  const client = getOAuthClient();
  client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const calendar = google.calendar({ version: "v3", auth: client });

  const { startISO, endISO } = eventWindow(
    appt.scheduled_date,
    appt.scheduled_time,
    appt.duration_minutes ?? 60,
  );

  // 1) Try to find and move the existing event (keeps the same Meet link).
  try {
    const { data } = await calendar.events.list({
      calendarId:              "primary",
      privateExtendedProperty: [`appointmentId=${appointmentId}`],
      maxResults:              1,
      singleEvents:            true,
      showDeleted:             false,
    });
    const existing = data.items?.[0];

    if (existing?.id) {
      const res = await calendar.events.patch({
        calendarId:  "primary",
        eventId:     existing.id,
        sendUpdates: patient.email ? "all" : "none",
        requestBody: {
          start: { dateTime: startISO, timeZone: "Asia/Kolkata" },
          end:   { dateTime: endISO,   timeZone: "Asia/Kolkata" },
        },
      });
      const meetLink =
        res.data.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")?.uri ??
        res.data.hangoutLink ??
        appt.meeting_link ??
        null;
      await sql`UPDATE appointments SET meeting_link = ${meetLink}, updated_at = NOW() WHERE id = ${appointmentId}`;
      return { meetLink, error: null };
    }
  } catch (err) {
    console.error("[rescheduleMeetEventForAppointment] patch failed — regenerating:", err);
    // fall through to regenerate a fresh event
  }

  // 2) No existing event found (or patch failed) → create a fresh one.
  try {
    const meetLink = await createMeetEvent({
      appointmentId:   appt.id,
      planTitle:       appt.plan_title,
      patientName:     patient.full_name,
      patientEmail:    patient.email,
      scheduledDate:   appt.scheduled_date,
      scheduledTime:   appt.scheduled_time,
      durationMinutes: appt.duration_minutes ?? 60,
    });
    await sql`UPDATE appointments SET meeting_link = ${meetLink}, updated_at = NOW() WHERE id = ${appointmentId}`;
    return { meetLink, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[rescheduleMeetEventForAppointment] regenerate failed:", err);
    return { meetLink: null, error: msg };
  }
}
