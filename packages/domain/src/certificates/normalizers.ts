import { computeCertificateStatus } from "./status.js"
import type {
  CertificateDetailRecord,
  CertificateFileRecord,
  CertificateListRow,
} from "./types.js"

type CertificateFileInput = {
  id: string
  fileName: string
  contentType: string
  sizeBytes: number
  createdAt: Date | string
  createdBy: string | null
}

type CertificateInput = {
  id: string
  name: string
  expirationDate: Date | string | null
  internalNotes: string | null
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  updatedBy: string | null
  entity: { id: string; entity: string } | null
  /** Present only on the detail read; absent (→ `[]`) on list/create/update. */
  files?: CertificateFileInput[]
}

function toExpirationString(value: Date | string | null): string {
  if (value === null || value === "") return ""
  return value instanceof Date ? value.toISOString() : value
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

export function normalizeCertificateFile(file: CertificateFileInput): CertificateFileRecord {
  return {
    id: file.id,
    fileName: file.fileName,
    contentType: file.contentType,
    sizeBytes: file.sizeBytes,
    createdAt: toIsoString(file.createdAt),
    createdBy: file.createdBy,
  }
}

export function normalizeCertificate(certificate: CertificateInput): CertificateDetailRecord {
  const expirationDate = toExpirationString(certificate.expirationDate)
  return {
    id: certificate.id,
    name: certificate.name,
    expirationDate,
    internalNotes: certificate.internalNotes ?? "",
    status: computeCertificateStatus(expirationDate),
    createdAt: toIsoString(certificate.createdAt),
    updatedAt: toIsoString(certificate.updatedAt),
    createdBy: certificate.createdBy,
    updatedBy: certificate.updatedBy,
    entity: certificate.entity,
    files: (certificate.files ?? []).map(normalizeCertificateFile),
  }
}

export function normalizeCertificateListRow(certificate: CertificateInput): CertificateListRow {
  return normalizeCertificate(certificate)
}
