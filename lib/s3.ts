/**
 * S3 helpers for prescription uploads.
 *
 * Bucket is PRIVATE — files are never publicly accessible.
 * Use `getPresignedUrl()` to generate a temporary download link when
 * the admin needs to view / download a file.
 *
 * Key format:
 *   prescriptions/{patientId}/{patientId}_{YYYY-MM-DD}_{safeFileName}
 *
 * Required env vars (add to .env.local — never commit real values):
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_REGION        (default: ap-south-1)
 *   AWS_S3_BUCKET     (default: brams-s3-prescriptions)
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ─── Config ───────────────────────────────────────────────────────────────────

const REGION = process.env.AWS_REGION ?? "ap-south-1";
const BUCKET = process.env.AWS_S3_BUCKET ?? "brams-s3-prescriptions";

/** Lazily built — avoids blowing up at module-load time if env vars are absent. */
function client(): S3Client {
  const accessKeyId     = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 not configured: set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local",
    );
  }
  return new S3Client({
    region: REGION,
    credentials: { accessKeyId, secretAccessKey },
  });
}

// ─── Key builder ─────────────────────────────────────────────────────────────

/**
 * Produces: `prescriptions/{patientId}/{patientId}_{date}_{safeFileName}`
 *
 * The full path is also the value stored in the DB's `file_url` column,
 * prefixed with `s3://` so callers can detect S3 vs legacy Vercel Blob URLs.
 */
export function buildS3Key(opts: {
  patientId: string;
  date: string;       // YYYY-MM-DD
  fileName: string;
}): string {
  const safe = opts.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `prescriptions/${opts.patientId}/${opts.patientId}_${opts.date}_${safe}`;
}

/** Converts a raw S3 key to the DB-storable URI format. */
export function keyToUri(key: string): string {
  return `s3://${BUCKET}/${key}`;
}

/** Returns the S3 key from a stored URI, or null if it's a legacy URL. */
export function uriToKey(uri: string): string | null {
  const prefix = `s3://${BUCKET}/`;
  return uri.startsWith(prefix) ? uri.slice(prefix.length) : null;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Uploads a prescription file to S3.
 * Objects are private by default; server-side encryption (AES256) is enforced.
 *
 * Returns the raw S3 key (use `keyToUri()` before storing in the DB).
 */
export async function uploadPrescription(opts: {
  patientId: string;
  date: string;          // YYYY-MM-DD — typically the appointment's scheduled_date
  fileName: string;
  body: Uint8Array;
  contentType: string;
}): Promise<string> {
  const key = buildS3Key(opts);

  await client().send(
    new PutObjectCommand({
      Bucket:               BUCKET,
      Key:                  key,
      Body:                 opts.body,
      ContentType:          opts.contentType || "application/octet-stream",
      ServerSideEncryption: "AES256",
      // Content-Disposition makes browsers download the file with the original name
      ContentDisposition: `attachment; filename="${opts.fileName.replace(/"/g, "")}"`,
    }),
  );

  return key;
}

// ─── Presigned URL ────────────────────────────────────────────────────────────

/**
 * Returns a temporary pre-signed GET URL for a private S3 object.
 * @param key      Raw S3 key (or pass a stored `s3://…` URI — auto-detected).
 * @param expiresIn Seconds until the URL expires (default: 1 hour).
 */
export async function getPresignedUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  // Accept either a raw key or the stored `s3://bucket/key` URI
  const resolvedKey = uriToKey(key) ?? key;
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: resolvedKey });
  return getSignedUrl(client(), cmd, { expiresIn });
}
