import { countTemplates, listTemplates } from "@builders/db"
import {
  LIST_TEMPLATES_MAX_PAGE_SIZE,
  LIST_TEMPLATES_PAGE_SIZE,
  type TemplateListRow,
} from "@builders/domain"
import type { ListInput, ListOutput } from "../list-view/contracts.js"

/** Cap on user-selected sort columns (the engine + API enforce the same). */
const MAX_SORT_LEVELS = 3

export type TemplatesListFilters = {
  entityId?: ReadonlyArray<string>
  propertyId?: ReadonlyArray<string>
  // Per-column identity search bars (Unit Type / Description). Array-shaped
  // (single-element) so they ride the engine's filter wire format alongside the
  // entity/property chips; each is a free-text ILIKE, both set narrows (AND).
  unitType?: ReadonlyArray<string>
  description?: ReadonlyArray<string>
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

  const entityId = normalizeIds(input.filters?.entityId)
  const propertyId = normalizeIds(input.filters?.propertyId)
  const unitType = normalizeIds(input.filters?.unitType)
  const description = normalizeIds(input.filters?.description)
  const filters =
    entityId || propertyId || unitType || description
      ? {
          ...(entityId ? { entityId } : {}),
          ...(propertyId ? { propertyId } : {}),
          ...(unitType ? { unitType } : {}),
          ...(description ? { description } : {}),
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

  const [rows, total] = await Promise.all([
    listTemplates({
      sort,
      filters,
      pagination: { skip: (page - 1) * pageSize, take: pageSize },
    }),
    countTemplates({ filters }),
  ])

  return { rows, total }
}
