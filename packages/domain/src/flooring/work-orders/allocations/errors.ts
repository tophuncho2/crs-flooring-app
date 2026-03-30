export type WorkOrderAllocationDomainErrorCode =
  | "WORK_ORDER_WAREHOUSE_REQUIRED"
  | "ALLOCATION_PRODUCT_MISMATCH"
  | "ALLOCATION_WAREHOUSE_MISMATCH"
  | "ALLOCATION_ITEM_MISMATCH"
  | "ALLOCATION_EXCEEDS_AVAILABLE_INVENTORY"
  | "ALLOCATION_EXCEEDS_ITEM_QUANTITY"

export class WorkOrderAllocationDomainError extends Error {
  readonly code: WorkOrderAllocationDomainErrorCode
  readonly field?: string

  constructor(input: {
    code: WorkOrderAllocationDomainErrorCode
    message: string
    field?: string
  }) {
    super(input.message)
    this.name = "WorkOrderAllocationDomainError"
    this.code = input.code
    this.field = input.field
  }
}

export function createWorkOrderAllocationDomainError(input: {
  code: WorkOrderAllocationDomainErrorCode
  message: string
  field?: string
}) {
  return new WorkOrderAllocationDomainError(input)
}

export function isWorkOrderAllocationDomainError(
  error: unknown,
): error is WorkOrderAllocationDomainError {
  return error instanceof WorkOrderAllocationDomainError
}
