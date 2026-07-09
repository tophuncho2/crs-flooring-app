import type { CertificateStatus } from "./status.js"

export type CertificateEntity = {
  id: string
  entity: string
}

export type CertificateFileRecord = {
  id: string
  fileName: string
  contentType: string
  sizeBytes: number
  /** ISO-string upload timestamp. */
  createdAt: string
  createdBy: string | null
}

export type CertificateDetailRecord = {
  id: string
  name: string
  /** ISO-string; `""` when no expiration date is set. */
  expirationDate: string
  internalNotes: string
  status: CertificateStatus
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
  entity: CertificateEntity | null
  /** Attached files, oldest-first. Empty on list rows (not selected there). */
  files: CertificateFileRecord[]
}

export type CertificateListRow = CertificateDetailRecord

export type CertificatePrimaryForm = {
  name: string
  /** `"YYYY-MM-DD"` or `""`. */
  expirationDate: string
  internalNotes: string
  entityId: string
}
