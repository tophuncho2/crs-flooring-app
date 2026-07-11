import { BaseExecutionError } from "../../shared/execution-error.js"

export type TemplatePlannedProductErrorCode =
  "TEMPLATE_PLANNED_PRODUCT_VALIDATION_FAILED"

export class TemplatePlannedProductExecutionError extends BaseExecutionError<TemplatePlannedProductErrorCode> {}
