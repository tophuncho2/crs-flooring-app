import { BaseExecutionError } from "../shared/execution-error.js"

export type JobTypeErrorCode =
  | "JOB_TYPE_VALIDATION_FAILED"
  | "JOB_TYPE_NOT_FOUND"
  | "JOB_TYPE_NAME_CONFLICT"

export class JobTypeExecutionError extends BaseExecutionError<JobTypeErrorCode> {}
