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
  meeting_link: string | null;
  admin_notes: string | null;
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
  const rows = await sql`
    SELECT p.*,
           COALESCE(COUNT(a.id), 0)::int AS appointment_count,
           MAX(a.scheduled_date)::text   AS last_appointment_date
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

export async function getAppointmentById(id: string): Promise<Appointment | null> {
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
    SELECT a.*, row_to_json(p.*) AS patient
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    ORDER BY a.scheduled_date DESC, a.scheduled_time DESC
  `;
  return rows as AppointmentWithPatient[];
}

export async function updateAppointment(
  id: string,
  patch: Partial<Pick<Appointment,
    "status" | "payment_status" | "meeting_link" | "admin_notes"
  >>
): Promise<void> {
  await sql`
    UPDATE appointments SET
      status         = COALESCE(${patch.status         ?? null}, status),
      payment_status = COALESCE(${patch.payment_status ?? null}, payment_status),
      meeting_link   = COALESCE(${patch.meeting_link   ?? null}, meeting_link),
      admin_notes    = COALESCE(${patch.admin_notes    ?? null}, admin_notes),
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
