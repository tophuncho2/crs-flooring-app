import type { ManufacturerOption } from "@builders/domain"
import { searchManufacturerOptions } from "@builders/db"

export type SearchManufacturerOptionsInput = {
  search?: string
  take?: number
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

export async function searchManufacturerOptionsUseCase(
  input: SearchManufacturerOptionsInput,
): Promise<ManufacturerOption[]> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  return searchManufacturerOptions({ search, take })
}
