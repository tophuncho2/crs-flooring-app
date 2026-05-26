import { listInventoryCutLogsPage } from "@builders/db"
import {
  INVENTORY_CUT_LOG_MAX_PAGE_SIZE,
  type InventoryCutLogPage,
} from "@builders/domain"
import { CutLogExecutionError } from "./errors.js"

export type ListInventoryCutLogsInput = {
  inventoryId: string
  skip: number
  take: number
}

function failValidation(message: string, field: string): never {
  throw new CutLogExecutionError({
    code: "CUT_LOG_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

export async function listInventoryCutLogsUseCase(
  input: ListInventoryCutLogsInput,
): Promise<InventoryCutLogPage> {
  if (!Number.isInteger(input.skip) || input.skip < 0) {
    failValidation("skip must be a non-negative integer", "skip")
  }
  if (
    !Number.isInteger(input.take) ||
    input.take < 1 ||
    input.take > INVENTORY_CUT_LOG_MAX_PAGE_SIZE
  ) {
    failValidation(
      `take must be between 1 and ${INVENTORY_CUT_LOG_MAX_PAGE_SIZE}`,
      "take",
    )
  }

  return listInventoryCutLogsPage({
    inventoryId: input.inventoryId,
    skip: input.skip,
    take: input.take,
  })
}
