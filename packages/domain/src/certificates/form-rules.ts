import { isBlankName } from "../shared/name-rules.js"
import { toDateInputValue } from "../shared/date-format.js"
import {
  CERTIFICATE_NAME_REQUIRED_MESSAGE,
  CERTIFICATE_NOTES_TOO_LONG_MESSAGE,
} from "./error-messages.js"
import type { CertificateDetailRecord, CertificatePrimaryForm } from "./types.js"

export const CERTIFICATE_NOTES_MAX_LENGTH = 500

export const EMPTY_CERTIFICATE_FORM: CertificatePrimaryForm = {
  name: "",
  expirationDate: "",
  internalNotes: "",
  entityId: "",
}

export function toCertificatePrimaryForm(
  certificate: CertificateDetailRecord,
): CertificatePrimaryForm {
  return {
    name: certificate.name,
    expirationDate: toDateInputValue(certificate.expirationDate),
    internalNotes: certificate.internalNotes,
    entityId: certificate.entity?.id ?? "",
  }
}

/** Returns an error message string, or `""` when the form is valid. */
export function validateCertificatePrimaryForm(form: CertificatePrimaryForm): string {
  if (isBlankName(form.name)) return CERTIFICATE_NAME_REQUIRED_MESSAGE
  if (form.internalNotes.length > CERTIFICATE_NOTES_MAX_LENGTH) {
    return CERTIFICATE_NOTES_TOO_LONG_MESSAGE
  }
  return ""
}
