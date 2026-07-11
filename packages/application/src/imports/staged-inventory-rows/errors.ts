import { BaseExecutionError } from "../../shared/execution-error.js"

export type StagedInventoryErrorCode =
  | "STAGED_VALIDATION_FAILED"
  | "STAGED_STALE_ROW_VERSION"
  | "STAGED_BATCH_INELIGIBLE"
  | "STAGED_BATCH_RACE"
  | "STAGED_MATERIALIZE_PRECONDITION_FAILED"
  | "STAGED_PARENT_NOT_FOUND"

export class StagedInventoryExecutionError extends BaseExecutionError<StagedInventoryErrorCode> {}
