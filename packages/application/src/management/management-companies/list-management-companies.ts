import {
  LIST_MANAGEMENT_COMPANIES_MAX_PAGE_SIZE,
  LIST_MANAGEMENT_COMPANIES_PAGE_SIZE,
  type ManagementCompanyListRow,
  type ManagementCompanyOption,
} from "@builders/domain"
import {
  listManagementCompaniesForListView,
  searchManagementCompanyOptions,
} from "@builders/db"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

export type ManagementCompaniesListFilters = {
  state?: ReadonlyArray<string>
}

function normalizeStateCodes(
  raw: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined {
  if (!raw || raw.length === 0) return undefined
  const cleaned = Array.from(
    new Set(
      raw
        .map((entry) => entry.trim().toUpperCase())
        .filter((entry) => /^[A-Z]{2}$/.test(entry)),
    ),
  )
  return cleaned.length > 0 ? cleaned : undefined
}

export async function listManagementCompaniesUseCase(
  input: ListInput<ManagementCompaniesListFilters>,
): Promise<ListOutput<ManagementCompanyListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_MANAGEMENT_COMPANIES_PAGE_SIZE)
  const pageSize = Math.max(
    1,
    Math.min(LIST_MANAGEMENT_COMPANIES_MAX_PAGE_SIZE, requestedPageSize),
  )

  const search = input.search?.trim() || undefined
  const state = normalizeStateCodes(input.filters?.state)

  const { rows, total } = await listManagementCompaniesForListView({
    search,
    filters: state ? { state } : undefined,
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}

export type SearchManagementCompanyOptionsInput = {
  search?: string
  skip?: number
  take?: number
}

export type SearchManagementCompanyOptionsResult = {
  items: ManagementCompanyOption[]
  hasMore: boolean
}

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

export async function searchManagementCompanyOptionsUseCase(
  input: SearchManagementCompanyOptionsInput,
): Promise<SearchManagementCompanyOptionsResult> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? OPTIONS_DEFAULT_TAKE)
  const take = Math.max(1, Math.min(OPTIONS_MAX_TAKE, requested))
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  return searchManagementCompanyOptions({ search, skip, take })
}
