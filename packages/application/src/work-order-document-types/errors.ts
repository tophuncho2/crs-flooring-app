import { BaseExecutionError } from "../shared/execution-error.js"

export type WorkOrderDocumentTypeErrorCode =
  | "WORK_ORDER_DOCUMENT_TYPE_VALIDATION_FAILED"
  | "WORK_ORDER_DOCUMENT_TYPE_NOT_FOUND"
  | "WORK_ORDER_DOCUMENT_TYPE_NAME_CONFLICT"

export class WorkOrderDocumentTypeExecutionError extends BaseExecutionError<WorkOrderDocumentTypeErrorCode> {}
