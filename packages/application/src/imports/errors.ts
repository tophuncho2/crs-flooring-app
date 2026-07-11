import { BaseExecutionError } from "../shared/execution-error.js"

export type ImportErrorCode =
  | "IMPORT_VALIDATION_FAILED"
  | "IMPORT_NOT_FOUND"
  | "IMPORT_WAREHOUSE_NOT_FOUND"
  | "IMPORT_ENTITY_NOT_FOUND"
  | "IMPORT_DELETE_BLOCKED_BY_INVENTORY"
  | "IMPORT_WAREHOUSE_CHANGE_BLOCKED_BY_INVENTORY"

export class ImportExecutionError extends BaseExecutionError<ImportErrorCode> {}
