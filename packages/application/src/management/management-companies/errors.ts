export type ManagementCompanyErrorCode =
  | "MANAGEMENT_COMPANY_VALIDATION_FAILED"
  | "MANAGEMENT_COMPANY_NOT_FOUND"
  | "MANAGEMENT_COMPANY_NAME_CONFLICT"
  | "MANAGEMENT_COMPANY_IN_USE"

export class ManagementCompanyExecutionError extends Error {
  readonly code: ManagementCompanyErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: ManagementCompanyErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "ManagementCompanyExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
