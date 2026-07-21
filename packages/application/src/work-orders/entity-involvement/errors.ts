import { BaseExecutionError } from "../../shared/execution-error.js"

export type WorkOrderEntityInvolvementErrorCode =
  | "WORK_ORDER_ENTITY_INVOLVEMENT_VALIDATION_FAILED"
  | "WORK_ORDER_ENTITY_INVOLVEMENT_LINK_INVALID"

export class WorkOrderEntityInvolvementExecutionError extends BaseExecutionError<WorkOrderEntityInvolvementErrorCode> {}
