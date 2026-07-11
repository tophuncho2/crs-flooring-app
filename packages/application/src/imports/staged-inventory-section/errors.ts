import { BaseExecutionError } from "../../shared/execution-error.js"

export type ImportStagedInventorySectionErrorCode =
  | "SECTION_PARENT_NOT_FOUND"
  | "SECTION_FILTER_VALIDATION_FAILED"
  | "SECTION_UNIT_VALIDATION_FAILED"
  | "SECTION_ROW_VALIDATION_FAILED"
  | "SECTION_ROW_DIFF_VALIDATION_FAILED"

export class ImportStagedInventorySectionExecutionError extends BaseExecutionError<ImportStagedInventorySectionErrorCode> {}
