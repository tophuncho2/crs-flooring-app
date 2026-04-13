export type GovernanceErrorCode =
  | "GOVERNANCE_USER_NOT_FOUND"
  | "GOVERNANCE_CREATE_BLOCKED"
  | "GOVERNANCE_INVALID_CREATION_ROLE"
  | "GOVERNANCE_ROLE_CHANGE_BLOCKED"
  | "GOVERNANCE_INVALID_ROLE_TRANSITION"
  | "GOVERNANCE_DELETE_BLOCKED"
  | "GOVERNANCE_PASSWORD_ALREADY_SET"

export class GovernanceExecutionError extends Error {
  readonly code: GovernanceErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: GovernanceErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "GovernanceExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
