import { listIndicatorsForProduct } from "@builders/db"
import {
  INVENTORY_INDICATOR_SECTION_MAX_PAGE_SIZE,
  type InventoryIndicatorPage,
} from "@builders/domain"
import { InventoryIndicatorExecutionError } from "./errors.js"

export type ListIndicatorsForProductInput = {
  productId: string
  skip: number
  take: number
}

function failValidation(message: string, field: string): never {
  throw new InventoryIndicatorExecutionError({
    code: "INVENTORY_INDICATOR_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

/**
 * Paginated read of indicators for one parent product — the record-view section
 * face. Ordered newest-first (`createdAt DESC, id DESC`).
 */
export async function listIndicatorsForProductUseCase(
  input: ListIndicatorsForProductInput,
): Promise<InventoryIndicatorPage> {
  if (!Number.isInteger(input.skip) || input.skip < 0) {
    failValidation("skip must be a non-negative integer", "skip")
  }
  if (
    !Number.isInteger(input.take) ||
    input.take < 1 ||
    input.take > INVENTORY_INDICATOR_SECTION_MAX_PAGE_SIZE
  ) {
    failValidation(
      `take must be between 1 and ${INVENTORY_INDICATOR_SECTION_MAX_PAGE_SIZE}`,
      "take",
    )
  }

  return listIndicatorsForProduct({
    productId: input.productId,
    skip: input.skip,
    take: input.take,
  })
}
