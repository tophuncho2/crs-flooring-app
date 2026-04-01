import {
  isWorkOrderAllocationExecutionError,
} from "@builders/application"
import {
  isWorkOrderAllocationDomainError,
  type WorkOrderAllocationDomainErrorCode,
} from "@builders/domain"
import { createAppError } from "@/server/http/api-helpers"

function mapAllocationDomainErrorStatus(code: WorkOrderAllocationDomainErrorCode) {
  switch (code) {
    case "ALLOCATION_ITEM_MISMATCH":
      return 404
    case "WORK_ORDER_WAREHOUSE_REQUIRED":
      return 409
    default:
      return 400
  }
}

export function normalizeWorkOrderAllocationApplicationError(error: unknown): never {
  if (isWorkOrderAllocationExecutionError(error)) {
    throw createAppError(error.message, {
      status: error.status,
      field: error.field,
      payload: error.payload,
    })
  }

  if (isWorkOrderAllocationDomainError(error)) {
    throw createAppError(error.message, {
      status: mapAllocationDomainErrorStatus(error.code),
      field: error.field,
    })
  }

  throw error
}
