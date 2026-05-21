import { searchPropertyOptions } from "@builders/db"
import type { PropertyOption } from "@builders/domain"

export type SearchPropertyOptionsInput = {
  search?: string
  managementCompanyId?: string
  skip?: number
  take?: number
}

export type SearchPropertyOptionsResult = {
  items: PropertyOption[]
  hasMore: boolean
}

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

export async function searchPropertyOptionsUseCase(
  input: SearchPropertyOptionsInput,
): Promise<SearchPropertyOptionsResult> {
  const search = input.search?.trim() || undefined
  const managementCompanyId = input.managementCompanyId?.trim() || undefined
  const requested = Math.floor(input.take ?? OPTIONS_DEFAULT_TAKE)
  const take = Math.max(1, Math.min(OPTIONS_MAX_TAKE, requested))
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  return searchPropertyOptions({ search, managementCompanyId, skip, take })
}
