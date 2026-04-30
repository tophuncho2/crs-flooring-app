import { countTemplates, listTemplates } from "@builders/db"
import type { TemplateListRow } from "@builders/domain"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 200

/**
 * Filter shape for the templates list. Starts as an empty record;
 * concrete filter dimensions will be added alongside the canonical
 * filter UI wiring in the templates sweep. Until then, the controller /
 * use case / repo accept the empty shape as a foundation pass-through.
 */
export type TemplatesListFilters = Record<string, never>

export async function listTemplatesUseCase(
  input: ListInput<TemplatesListFilters>,
): Promise<ListOutput<TemplateListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || DEFAULT_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(MAX_PAGE_SIZE, requestedPageSize))

  const search = input.search?.trim() || undefined
  const sort = input.sort
    ? {
        direction: input.sort.direction,
        groupByKeys: input.group ? [input.group.field] : [],
        isGroupingEnabled: Boolean(input.group),
      }
    : undefined

  const [rows, total] = await Promise.all([
    listTemplates({
      searchQuery: search,
      sort,
      filters: input.filters,
      pagination: { skip: (page - 1) * pageSize, take: pageSize },
    }),
    countTemplates({ searchQuery: search, filters: input.filters }),
  ])

  return { rows, total }
}
