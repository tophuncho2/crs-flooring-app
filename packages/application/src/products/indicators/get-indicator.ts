import { getIndicatorDetailById } from "@builders/db"
import type { InventoryIndicatorDetail } from "@builders/domain"

export type GetIndicatorInput = {
  productId: string
  indicatorId: string
}

/**
 * Single indicator read (with prev/next neighbors) for the record-view edit face.
 * Scoped to the addressed product — returns null when the indicator doesn't exist
 * or belongs to a different product, which the route surfaces as a 404.
 */
export async function getIndicatorUseCase(
  input: GetIndicatorInput,
): Promise<InventoryIndicatorDetail | null> {
  const detail = await getIndicatorDetailById(input.indicatorId, { withNeighbors: true })
  if (!detail) return null
  if (detail.productId !== input.productId) return null
  return detail
}
