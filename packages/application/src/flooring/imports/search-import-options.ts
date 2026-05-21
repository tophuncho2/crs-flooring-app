import type { ImportOption } from "@builders/domain"
import { searchImportOptions } from "@builders/db"

export type SearchImportOptionsInput = {
  /** Required scope — picker is warehouse-gated. */
  warehouseId: string
  search?: string
  take?: number
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

export async function searchImportOptionsUseCase(
  input: SearchImportOptionsInput,
): Promise<ImportOption[]> {
  const warehouseId = input.warehouseId.trim()
  if (!warehouseId) return []
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  return searchImportOptions({ warehouseId, search, take })
}
