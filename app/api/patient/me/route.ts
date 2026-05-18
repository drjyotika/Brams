import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  PATIENT_SESSION_COOKIE,
  verifyPatientToken,
} from "../../../../lib/auth";
import { findPatientForAuth } from "../../../../lib/patient-auth";
import { getAppointmentsForPatient } from "../../../../lib/bookings";

/**
 * GET /api/patient/me
 *
 * Returns the currently logged-in patient plus their appointments.
 */
export async function GET() {
  const jar   = await cookies();
  const token = jar.get(PATIENT_SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const patientId = await verifyPatientToken(token);
  if (!patientId) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const patient = await findPatientForAuth(patientId);
  if (!patient) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }

  const appointments = await getAppointmentsForPatient(patient.id);

  return NextResponse.json({
    patient: {
      id:                patient.id,
      full_name:         patient.full_name,
      email:             patient.email,
      phone:             patient.phone,
      age:               patient.age,
      gender:            patient.gender,
      city:              patient.city,
      created_at:        patient.created_at,
      last_login_at:     patient.last_login_at,
      email_verified:    patient.email_verified ?? false,
      email_verified_at: patient.email_verified_at,
      is_suspended:      patient.is_suspended ?? false,
      suspension_reason: patient.suspension_reason,
    },
    appointments,
  });
}
