import { sql } from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Gender = "male" | "female" | "other" | "prefer-not-to-say";
export type Mode = "online" | "offline";
export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";
export type PaymentStatus = "unpaid" | "paid" | "refunded" | "failed";
export type GatewayStatus = "initiated" | "success" | "failed" | "refunded";

export type Patient = {
  id: string;
  full_name: string;
  age: number | null;
  gender: Gender | null;
  phone: string;
  email: string | null;
  city: string | null;
  notes: string | null;
  /**
   * Patient-side auth (added by patient-auth.ts migration).  Optional on the
   * base type because rows created before the migration may have NULLs and
   * code that doesn't care about auth shouldn't have to read these.
   */
  password_hash?:           string | null;
  last_login_at?:           Date | null;
  failed_login_count?:      number;
  locked_until?:            Date | null;
  email_verified?:          boolean;
  email_verified_at?:       Date | null;
  verification_otp?:        string | null;
  verification_token?:      string | null;
  verification_expires_at?: Date | null;
  is_suspended?:            boolean;
  suspended_at?:            Date | null;
  suspension_reason?:       string | null;
  created_at: Date;
  updated_at: Date;
};

export type Appointment = {
  id: string;
  patient_id: string;
  plan_id: string;
  plan_title: string;
  scheduled_date: string;        // YYYY-MM-DD
  scheduled_time: string;        // HH:mm:ss
  duration_minutes: number;
  mode: Mode;
  reason_for_consultation: string | null;
  consultation_fee_paise: number;
  booking_fee_paise: number;
  total_paise: number;
  status: AppointmentStatus;
  payment_status: PaymentStatus;
  meeting_link:   string | null;
  admin_notes:    string | null;
  coupon_code:    string | null;
  discount_paise: number;
  created_at: Date;
  updated_at: Date;
};

export type AppointmentUpload = {
  id: string;
  appointment_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_at: Date;
};

export type Payment = {
  id: string;
  appointment_id: string;
  amount_paise: number;
  currency: string;
  gateway: string | null;
  gateway_payment_id: string | null;
  gateway_order_id: string | null;
  status: GatewayStatus;
  meta: unknown;
  created_at: Date;
  updated_at: Date;
};

// ─── Patient queries ──────────────────────────────────────────────────────────

export async function upsertPatient(input: {
  full_name: string;
  age?: number | null;
  gender?: Gender | null;
  phone: string;
  email?: string | null;
  city?: string | null;
}): Promise<Patient> {
  const rows = await sql`
    INSERT INTO patients (full_name, age, gender, phone, email, city)
    VALUES (${input.full_name}, ${input.age ?? null}, ${input.gender ?? null},
            ${input.phone}, ${input.email ?? null}, ${input.city ?? null})
    ON CONFLICT (phone) DO UPDATE SET
      full_name  = EXCLUDED.full_name,
      age        = COALESCE(EXCLUDED.age,    patients.age),
      gender     = COALESCE(EXCLUDED.gender, patients.gender),
      email      = COALESCE(EXCLUDED.email,  patients.email),
      city       = COALESCE(EXCLUDED.city,   patients.city),
      updated_at = NOW()
    RETURNING *
  `;
  return rows[0] as Patient;
}

export type PatientWithStats = Patient & {
  appointment_count: number;
  last_appointment_date: string | null;
};

export async function getAllPatients(): Promise<PatientWithStats[]> {
  // COALESCE on the new auth columns so older patient rows (created before
  // the patient-auth migration) still return well-typed booleans.
  const rows = await sql`
    SELECT p.id, p.full_name, p.age, p.gender, p.phone, p.email, p.city, p.notes,
           p.created_at, p.updated_at,
           COALESCE(p.email_verified, FALSE) AS email_verified,
           p.email_verified_at,
           COALESCE(p.is_suspended,   FALSE) AS is_suspended,
           p.suspension_reason,
           p.last_login_at,
           (p.password_hash IS NOT NULL)     AS has_password,
           COALESCE(COUNT(a.id), 0)::int     AS appointment_count,
           MAX(a.scheduled_date)::text       AS last_appointment_date
    FROM patients p
    LEFT JOIN appointments a ON a.patient_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;
  return rows as PatientWithStats[];
}

export async function getPatientById(id: string): Promise<Patient | null> {
  const rows = await sql`SELECT * FROM patients WHERE id = ${id} LIMIT 1`;
  return (rows[0] as Patient) ?? null;
}

// ─── Appointment queries ──────────────────────────────────────────────────────

export async function createAppointment(input: {
  patient_id: string;
  plan_id: string;
  plan_title: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes?: number;
  mode?: Mode;
  reason_for_consultation?: string | null;
  consultation_fee_paise: number;
  booking_fee_paise?: number;
  total_paise: number;
}): Promise<Appointment> {
  const rows = await sql`
    INSERT INTO appointments (
      patient_id, plan_id, plan_title, scheduled_date, scheduled_time,
      duration_minutes, mode, reason_for_consultation,
      consultation_fee_paise, booking_fee_paise, total_paise
    ) VALUES (
      ${input.patient_id}, ${input.plan_id}, ${input.plan_title},
      ${input.scheduled_date}, ${input.scheduled_time},
      ${input.duration_minutes ?? 30}, ${input.mode ?? "online"},
      ${input.reason_for_consultation ?? null},
      ${input.consultation_fee_paise}, ${input.booking_fee_paise ?? 0},
      ${input.total_paise}
    )
    RETURNING *
  `;
  return rows[0] as Appointment;
}

/** RFC 4122 UUID matcher — guards against non-UUID ids hitting the DB. */
export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function getAppointmentById(id: string): Promise<Appointment | null> {
  // A malformed id would throw a Postgres "invalid input syntax for uuid"
  // error (HTTP 500). Treat it as simply "not found" instead.
  if (!isUuid(id)) return null;
  const rows = await sql`SELECT * FROM appointments WHERE id = ${id} LIMIT 1`;
  return (rows[0] as Appointment) ?? null;
}

export async function getAppointmentsForPatient(patient_id: string): Promise<Appointment[]> {
  const rows = await sql`
    SELECT * FROM appointments
    WHERE patient_id = ${patient_id}
    ORDER BY scheduled_date DESC, scheduled_time DESC
  `;
  return rows as Appointment[];
}

export type AppointmentWithPatient = Appointment & { patient: Patient };

export async function getAllAppointments(): Promise<AppointmentWithPatient[]> {
  const rows = await sql`
    SELECT a.*, row_to_json(p.*) AS patient,
           COUNT(au.id)::int AS upload_count
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    LEFT JOIN appointment_uploads au ON au.appointment_id = a.id
    GROUP BY a.id, p.id
    ORDER BY a.scheduled_date DESC, a.scheduled_time DESC
  `;
  return rows as AppointmentWithPatient[];
}

export async function updateAppointment(
  id: string,
  patch: Partial<Pick<Appointment,
    "status" | "payment_status" | "meeting_link" | "admin_notes" |
    "scheduled_date" | "scheduled_time"
  >>
): Promise<void> {
  await sql`
    UPDATE appointments SET
      status         = COALESCE(${patch.status         ?? null}, status),
      payment_status = COALESCE(${patch.payment_status ?? null}, payment_status),
      meeting_link   = COALESCE(${patch.meeting_link   ?? null}, meeting_link),
      admin_notes    = COALESCE(${patch.admin_notes    ?? null}, admin_notes),
      scheduled_date = COALESCE(${patch.scheduled_date ?? null}, scheduled_date),
      scheduled_time = COALESCE(${patch.scheduled_time ?? null}, scheduled_time),
      updated_at     = NOW()
    WHERE id = ${id}
  `;
}

// ─── Uploads ──────────────────────────────────────────────────────────────────

export async function addAppointmentUpload(input: {
  appointment_id: string;
  file_name: string;
  file_url: string;
  file_size?: number | null;
  mime_type?: string | null;
}): Promise<AppointmentUpload> {
  const rows = await sql`
    INSERT INTO appointment_uploads (appointment_id, file_name, file_url, file_size, mime_type)
    VALUES (${input.appointment_id}, ${input.file_name}, ${input.file_url},
            ${input.file_size ?? null}, ${input.mime_type ?? null})
    RETURNING *
  `;
  return rows[0] as AppointmentUpload;
}

export async function getUploadsForAppointment(
  appointment_id: string,
): Promise<AppointmentUpload[]> {
  const rows = await sql`
    SELECT * FROM appointment_uploads
    WHERE appointment_id = ${appointment_id}
    ORDER BY uploaded_at DESC
  `;
  return rows as AppointmentUpload[];
}

export type UploadWithAppointment = AppointmentUpload & {
  appointment_date: string;
  appointment_time: string;
  plan_title: string;
};

/** All uploads across every appointment for a patient, newest first. */
export async function getUploadsForPatient(
  patient_id: string,
): Promise<UploadWithAppointment[]> {
  const rows = await sql`
    SELECT
      au.id, au.appointment_id, au.file_name, au.file_url,
      au.file_size, au.mime_type, au.uploaded_at,
      a.scheduled_date AS appointment_date,
      a.scheduled_time AS appointment_time,
      a.plan_title
    FROM appointment_uploads au
    JOIN appointments a ON a.id = au.appointment_id
    WHERE a.patient_id = ${patient_id}
    ORDER BY au.uploaded_at DESC
  `;
  return rows as UploadWithAppointment[];
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function recordPayment(input: {
  appointment_id: string;
  amount_paise: number;
  gateway?: string | null;
  gateway_payment_id?: string | null;
  gateway_order_id?: string | null;
  status?: GatewayStatus;
  meta?: unknown;
}): Promise<Payment> {
  const metaJson = input.meta != null ? JSON.stringify(input.meta) : null;
  const rows = await sql`
    INSERT INTO payments (
      appointment_id, amount_paise, gateway, gateway_payment_id,
      gateway_order_id, status, meta
    ) VALUES (
      ${input.appointment_id}, ${input.amount_paise}, ${input.gateway ?? null},
      ${input.gateway_payment_id ?? null}, ${input.gateway_order_id ?? null},
      ${input.status ?? "initiated"}, ${metaJson}
    )
    RETURNING *
  `;
  return rows[0] as Payment;
}

export async function getPaymentsForAppointment(
  appointment_id: string,
): Promise<Payment[]> {
  const rows = await sql`
    SELECT * FROM payments
    WHERE appointment_id = ${appointment_id}
    ORDER BY created_at DESC
  `;
  return rows as Payment[];
}
