export type WorkflowTerminalStatus = "FAILED" | "SUPERSEDED"

export class WorkflowProcessingError extends Error {
  readonly code: string
  readonly retryable: boolean
  readonly terminalStatus: WorkflowTerminalStatus

  constructor(input: {
    code: string
    message: string
    retryable: boolean
    terminalStatus?: WorkflowTerminalStatus
  }) {
    super(input.message)
    this.name = "WorkflowProcessingError"
    this.code = input.code
    this.retryable = input.retryable
    this.terminalStatus = input.terminalStatus ?? "FAILED"
  }
}

export function createRetryableWorkflowProcessingError(code: string, message: string) {
  return new WorkflowProcessingError({
    code,
    message,
    retryable: true,
    terminalStatus: "FAILED",
  })
}

export function createTerminalWorkflowProcessingError(
  code: string,
  message: string,
  terminalStatus: WorkflowTerminalStatus = "FAILED",
) {
  return new WorkflowProcessingError({
    code,
    message,
    retryable: false,
    terminalStatus,
  })
}

export function isWorkflowProcessingError(error: unknown): error is WorkflowProcessingError {
  return error instanceof WorkflowProcessingError
}
