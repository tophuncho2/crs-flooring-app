import type { ManagementCompanyStateOption } from "@builders/domain"
import { searchManagementCompanyStates } from "@builders/db"

export type SearchManagementCompanyStatesInput = {
  search?: string
  take?: number
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

/**
 * Distinct state codes across all management companies for the list-view
 * StateFilterChip. Trims `search`, clamps `take` to [1, MAX_TAKE], delegates
 * to the read repo. States are not a separate entity — values are derived via
 * SELECT DISTINCT over the flooring_management_company table.
 */
export async function searchManagementCompanyStatesUseCase(
  input: SearchManagementCompanyStatesInput,
): Promise<ManagementCompanyStateOption[]> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  return searchManagementCompanyStates({ search, take })
}
