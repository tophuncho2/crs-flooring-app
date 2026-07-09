// Pure rules for certificate file attachments — size/type constraints, filename
// sanitization, and the deterministic S3 object-key format. No I/O; the use case
// (application) does the actual bucket + DB work and throws named errors.

/** Max upload size for a certificate file: 10 MB. */
export const CERTIFICATE_FILE_MAX_BYTES = 10 * 1024 * 1024

/**
 * Accepted MIME types. Certificates arrive as PDFs, scans, or phone photos, so
 * PDF + common image formats cover the real cases without widening the surface
 * to office/archive formats nobody attaches here.
 */
export const CERTIFICATE_FILE_ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const

export type CertificateFileContentType = (typeof CERTIFICATE_FILE_ALLOWED_CONTENT_TYPES)[number]

export function isAllowedCertificateFileContentType(contentType: string): boolean {
  return (CERTIFICATE_FILE_ALLOWED_CONTENT_TYPES as readonly string[]).includes(contentType)
}

export function isAllowedCertificateFileSize(sizeBytes: number): boolean {
  return Number.isInteger(sizeBytes) && sizeBytes > 0 && sizeBytes <= CERTIFICATE_FILE_MAX_BYTES
}

/**
 * Collapse a user-supplied filename to a safe, bounded slug for the S3 object
 * key: strips path separators + reserved chars, folds runs of `_`, trims leading
 * dots/underscores, and caps length. Falls back to `file` when nothing survives.
 * Pure — the extension is preserved only insofar as its chars are kept.
 */
export function sanitizeCertificateFileName(fileName: string): string {
  const cleaned = fileName
    .trim()
    .replace(/[/\\]+/g, "_")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[._]+/, "")
    .slice(0, 120)
  return cleaned || "file"
}

/**
 * Deterministic private-bucket object key for a certificate file:
 * `certificates/{certificateId}/{fileId}/{safeName}`. The `fileId` segment
 * guarantees uniqueness even when two files share a name.
 */
export function buildCertificateFileObjectKey(input: {
  certificateId: string
  fileId: string
  fileName: string
}): string {
  return `certificates/${input.certificateId}/${input.fileId}/${sanitizeCertificateFileName(input.fileName)}`
}
