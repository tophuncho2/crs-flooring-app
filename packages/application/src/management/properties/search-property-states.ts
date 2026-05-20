import type { PropertyStateOption } from "@builders/domain"
import { searchPropertyStates } from "@builders/db"

export type SearchPropertyStatesInput = {
  search?: string
  take?: number
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

/**
 * Distinct state codes across all properties for the list-view StateFilterChip.
 * Trims `search`, clamps `take` to [1, MAX_TAKE], delegates to the read repo.
 * States are not a separate entity — values are derived via SELECT DISTINCT
 * over the property_hub table.
 */
export async function searchPropertyStatesUseCase(
  input: SearchPropertyStatesInput,
): Promise<PropertyStateOption[]> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  return searchPropertyStates({ search, take })
}
