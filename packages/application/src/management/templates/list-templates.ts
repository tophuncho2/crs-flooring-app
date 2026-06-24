import { countTemplates, listTemplates } from "@builders/db"
import {
  LIST_TEMPLATES_MAX_PAGE_SIZE,
  LIST_TEMPLATES_PAGE_SIZE,
  type TemplateListRow,
} from "@builders/domain"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

export type TemplatesListFilters = {
  entityId?: ReadonlyArray<string>
  propertyId?: ReadonlyArray<string>
}

function normalizeIds(
  raw: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined {
  if (!raw || raw.length === 0) return undefined
  const cleaned = Array.from(
    new Set(raw.map((entry) => entry.trim()).filter((entry) => entry.length > 0)),
  )
  return cleaned.length > 0 ? cleaned : undefined
}

export async function listTemplatesUseCase(
  input: ListInput<TemplatesListFilters>,
): Promise<ListOutput<TemplateListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_TEMPLATES_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(LIST_TEMPLATES_MAX_PAGE_SIZE, requestedPageSize))

  const search = input.search?.trim() || undefined
  const entityId = normalizeIds(input.filters?.entityId)
  const propertyId = normalizeIds(input.filters?.propertyId)
  const filters =
    entityId || propertyId
      ? {
          ...(entityId ? { entityId } : {}),
          ...(propertyId ? { propertyId } : {}),
        }
      : undefined

  const [rows, total] = await Promise.all([
    listTemplates({
      searchQuery: search,
      filters,
      pagination: { skip: (page - 1) * pageSize, take: pageSize },
    }),
    countTemplates({ searchQuery: search, filters }),
  ])

  return { rows, total }
}
