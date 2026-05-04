import { searchPropertyOptions } from "@builders/db"
import type { PropertyOption } from "@builders/domain"

export type SearchPropertyOptionsInput = {
  search?: string
  managementCompanyId?: string
  take?: number
}

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

export async function searchPropertyOptionsUseCase(
  input: SearchPropertyOptionsInput,
): Promise<PropertyOption[]> {
  const search = input.search?.trim() || undefined
  const managementCompanyId = input.managementCompanyId?.trim() || undefined
  const requested = Math.floor(input.take ?? OPTIONS_DEFAULT_TAKE)
  const take = Math.max(1, Math.min(OPTIONS_MAX_TAKE, requested))
  return searchPropertyOptions({ search, managementCompanyId, take })
}
