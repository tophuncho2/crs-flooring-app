import {
  LIST_PROPERTIES_MAX_PAGE_SIZE,
  LIST_PROPERTIES_PAGE_SIZE,
  normalizeStateCodeFilter,
  type PropertyListRow,
} from "@builders/domain"
import { listPropertiesForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

export type PropertiesListFilters = {
  managementCompanyId?: ReadonlyArray<string>
  state?: ReadonlyArray<string>
}

function normalizeManagementCompanyIds(
  raw: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined {
  if (!raw || raw.length === 0) return undefined
  const cleaned = Array.from(
    new Set(raw.map((entry) => entry.trim()).filter((entry) => entry.length > 0)),
  )
  return cleaned.length > 0 ? cleaned : undefined
}

export async function listPropertiesUseCase(
  input: ListInput<PropertiesListFilters>,
): Promise<ListOutput<PropertyListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_PROPERTIES_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(LIST_PROPERTIES_MAX_PAGE_SIZE, requestedPageSize))

  const search = input.search?.trim() || undefined
  const managementCompanyId = normalizeManagementCompanyIds(input.filters?.managementCompanyId)
  const state = normalizeStateCodeFilter(input.filters?.state)

  const filters =
    managementCompanyId || state
      ? {
          ...(managementCompanyId ? { managementCompanyId } : {}),
          ...(state ? { state } : {}),
        }
      : undefined

  const { rows, total } = await listPropertiesForListView({
    search,
    filters,
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}
