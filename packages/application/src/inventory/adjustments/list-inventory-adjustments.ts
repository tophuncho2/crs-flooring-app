import { listInventoryAdjustmentsPage } from "@builders/db"
import {
  INVENTORY_ADJUSTMENT_MAX_PAGE_SIZE,
  type EnrichedInventoryAdjustmentPage,
} from "@builders/domain"
import { InventoryAdjustmentExecutionError } from "./errors.js"

export type ListInventoryAdjustmentsInput = {
  inventoryId: string
  skip: number
  take: number
}

function failValidation(message: string, field: string): never {
  throw new InventoryAdjustmentExecutionError({
    code: "INVENTORY_ADJUSTMENT_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

export async function listInventoryAdjustmentsUseCase(
  input: ListInventoryAdjustmentsInput,
): Promise<EnrichedInventoryAdjustmentPage> {
  if (!Number.isInteger(input.skip) || input.skip < 0) {
    failValidation("skip must be a non-negative integer", "skip")
  }
  if (
    !Number.isInteger(input.take) ||
    input.take < 1 ||
    input.take > INVENTORY_ADJUSTMENT_MAX_PAGE_SIZE
  ) {
    failValidation(
      `take must be between 1 and ${INVENTORY_ADJUSTMENT_MAX_PAGE_SIZE}`,
      "take",
    )
  }

  return listInventoryAdjustmentsPage({
    inventoryId: input.inventoryId,
    skip: input.skip,
    take: input.take,
  })
}
