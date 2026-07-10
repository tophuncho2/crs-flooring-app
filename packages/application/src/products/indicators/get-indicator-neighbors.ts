import { getIndicatorNeighbors } from "@builders/db"
import type { InventoryIndicatorNeighbors } from "@builders/domain"

export type GetIndicatorNeighborsInput = {
  productId: string
  indicatorId: string
}

/**
 * Prev/next indicator neighbors within one parent product's set, powering the
 * record-view section stepper. Scoped to the indicator's own `productId`. Returns
 * null when the indicator doesn't exist or belongs to a different product — the
 * route surfaces that as a 404 (mirrors `getIndicatorUseCase`).
 */
export async function getIndicatorNeighborsUseCase(
  input: GetIndicatorNeighborsInput,
): Promise<InventoryIndicatorNeighbors | null> {
  const result = await getIndicatorNeighbors(input.indicatorId)
  if (!result) return null
  if (result.productId !== input.productId) return null
  return {
    previousIndicator: result.previousIndicator,
    nextIndicator: result.nextIndicator,
  }
}
