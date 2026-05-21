import type { ImportOption } from "@builders/domain"
import { searchImportOptions } from "@builders/db"

export type SearchImportOptionsInput = {
  search?: string
  take?: number
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

export async function searchImportOptionsUseCase(
  input: SearchImportOptionsInput,
): Promise<ImportOption[]> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  return searchImportOptions({ search, take })
}
