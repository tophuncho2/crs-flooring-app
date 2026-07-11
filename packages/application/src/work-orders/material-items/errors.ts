import { BaseExecutionError } from "../../shared/execution-error.js"

export type WorkOrderMaterialItemErrorCode =
  "WORK_ORDER_MATERIAL_ITEM_VALIDATION_FAILED"

export class WorkOrderMaterialItemExecutionError extends BaseExecutionError<WorkOrderMaterialItemErrorCode> {}
