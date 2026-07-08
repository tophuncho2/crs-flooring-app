import {
  LIST_IMPORTS_MAX_PAGE_SIZE,
  LIST_IMPORTS_PAGE_SIZE,
  type ImportRow,
} from "@builders/domain"
import { listImportsForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../list-view/contracts.js"

export type ImportsListFilters = {
  impNumber?: string
  warehouseId?: ReadonlyArray<string>
}

/** Cap on user-selected sort columns (the engine + API enforce the same). */
const MAX_SORT_LEVELS = 3

function normalizeWarehouseIds(
  raw: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined {
  if (!raw || raw.length === 0) return undefined
  const cleaned = Array.from(
    new Set(raw.map((entry) => entry.trim()).filter((entry) => entry.length > 0)),
  )
  return cleaned.length > 0 ? cleaned : undefined
}

export async function listImportsUseCase(
  input: ListInput<ImportsListFilters>,
): Promise<ListOutput<ImportRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_IMPORTS_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(LIST_IMPORTS_MAX_PAGE_SIZE, requestedPageSize))

  const search = input.search?.trim() || undefined
  const impNumber = input.filters?.impNumber?.trim() || undefined
  const warehouseId = normalizeWarehouseIds(input.filters?.warehouseId)

  const filters =
    impNumber || warehouseId
      ? {
          ...(impNumber ? { impNumber } : {}),
          ...(warehouseId ? { warehouseId } : {}),
        }
      : undefined

  // The multi-column `sorts` array is canonical; a single `sort` is treated as
  // an array of one. Highest priority first, capped at MAX_SORT_LEVELS. The repo
  // silently drops unknown fields, so no field whitelist is needed here.
  const sortList = input.sorts ?? (input.sort ? [input.sort] : [])
  const entries = sortList
    .slice(0, MAX_SORT_LEVELS)
    .map((entry) => ({ field: entry.field, direction: entry.direction }))
  const sort = entries.length > 0 ? { entries } : undefined

  const { rows, total } = await listImportsForListView({
    search,
    sort,
    filters,
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}
