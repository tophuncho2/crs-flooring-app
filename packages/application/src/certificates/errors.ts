import { BaseExecutionError } from "../shared/execution-error.js"

export type CertificateErrorCode =
  | "CERTIFICATE_VALIDATION_FAILED"
  | "CERTIFICATE_NOT_FOUND"
  | "CERTIFICATE_FILE_VALIDATION_FAILED"
  | "CERTIFICATE_FILE_NOT_FOUND"

export class CertificateExecutionError extends BaseExecutionError<CertificateErrorCode> {}
