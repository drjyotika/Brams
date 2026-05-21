import { sql } from "./db";

export type Feedback = {
  id:             string;
  appointment_id: string;
  patient_id:     string;
  rating:         number;
  comments:       string | null;
  created_at:     string;
};

export type FeedbackWithContext = Feedback & {
  patient_name:  string;
  patient_email: string | null;
  plan_title:    string;
  scheduled_date: string;
  scheduled_time: string;
};

export async function getFeedbackByAppointment(appointmentId: string): Promise<Feedback | null> {
  const rows = await sql`
    SELECT * FROM appointment_feedback WHERE appointment_id = ${appointmentId} LIMIT 1
  `;
  return (rows[0] as Feedback) ?? null;
}

export async function submitFeedback(
  appointmentId: string,
  patientId:     string,
  rating:        number,
  comments:      string | null,
): Promise<void> {
  await sql`
    INSERT INTO appointment_feedback (appointment_id, patient_id, rating, comments)
    VALUES (${appointmentId}, ${patientId}, ${rating}, ${comments ?? null})
    ON CONFLICT (appointment_id) DO UPDATE
      SET rating = EXCLUDED.rating, comments = EXCLUDED.comments
  `;
}

export async function getAllFeedbacks(): Promise<FeedbackWithContext[]> {
  const rows = await sql`
    SELECT
      f.*,
      p.full_name  AS patient_name,
      p.email      AS patient_email,
      a.plan_title,
      a.scheduled_date,
      a.scheduled_time
    FROM appointment_feedback f
    JOIN patients     p ON p.id = f.patient_id
    JOIN appointments a ON a.id = f.appointment_id
    ORDER BY f.created_at DESC
  `;
  return rows as FeedbackWithContext[];
}
