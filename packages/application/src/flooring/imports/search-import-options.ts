import {
  IMPORT_OPTIONS_DEFAULT_TAKE,
  IMPORT_OPTIONS_MAX_TAKE,
  type ImportOption,
} from "@builders/domain"
import { searchImportOptions } from "@builders/db"

export type SearchImportOptionsInput = {
  /** Required scope — picker is warehouse-gated. */
  warehouseId: string
  search?: string
  skip?: number
  take?: number
}

export type SearchImportOptionsResult = {
  items: ImportOption[]
  hasMore: boolean
}

export async function searchImportOptionsUseCase(
  input: SearchImportOptionsInput,
): Promise<SearchImportOptionsResult> {
  const warehouseId = input.warehouseId.trim()
  if (!warehouseId) return { items: [], hasMore: false }
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? IMPORT_OPTIONS_DEFAULT_TAKE)
  const take = Math.max(1, Math.min(IMPORT_OPTIONS_MAX_TAKE, requested))
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  return searchImportOptions({ warehouseId, search, skip, take })
}
