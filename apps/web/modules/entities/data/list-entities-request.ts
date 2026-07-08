import type {
  ListInput,
  ListOutput,
  ListSort,
  EntitiesListFilters,
} from "@builders/application"
import {
  LIST_ENTITIES_PAGE_SIZE,
  type EntityListRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

/**
 * Sort fields recognised by the entities list. Mirrors the API validator
 * allowlist and the toolbar Sort menu. The list defaults to `entity ASC` when no
 * `?sorts=` is present; any unknown field is dropped.
 */
export const ENTITIES_LIST_SORT_FIELDS = [
  "entity",
  "state",
  "createdAt",
  "updatedAt",
] as const satisfies readonly string[]

/** Cap on user-selected sort columns — mirrors the engine + API + use case. */
const ENTITIES_MAX_SORT_LEVELS = 3

/** The list's default order when the URL carries no `?sorts=` (preserve entity A→Z). */
const ENTITIES_DEFAULT_SORT: ListSort = { field: "entity", direction: "asc" }

function isAllowedSortField(value: string): boolean {
  return (ENTITIES_LIST_SORT_FIELDS as readonly string[]).includes(value)
}

/** Parse the ordered `?sorts=field:dir,field:dir` param (validated, deduped, capped). */
function parseSortsParam(raw: string | undefined): ListSort[] {
  if (!raw) return []
  const result: ListSort[] = []
  const seen = new Set<string>()
  for (const token of raw.split(",")) {
    const [field, direction] = token.split(":")
    if (!field || seen.has(field) || !isAllowedSortField(field)) continue
    seen.add(field)
    result.push({ field, direction: direction === "desc" ? "desc" : "asc" })
    if (result.length >= ENTITIES_MAX_SORT_LEVELS) break
  }
  return result
}

function encodeSortsParam(sorts: readonly ListSort[]): string {
  return sorts.map((entry) => `${entry.field}:${entry.direction}`).join(",")
}

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const raw = searchParams?.[key]
  return Array.isArray(raw) ? raw[0] : raw
}

function readSearchParamArray(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string[] {
  const raw = searchParams?.[key]
  if (raw === undefined) return []
  const list = Array.isArray(raw) ? raw : [raw]
  return list
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

export function parseEntitiesListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<EntitiesListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const entityNumber = (readSearchParam(searchParams, "entityNumber") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  const state = Array.from(
    new Set(
      readSearchParamArray(searchParams, "state")
        .map((entry) => entry.toUpperCase())
        .filter((entry) => /^[A-Z]{2}$/.test(entry)),
    ),
  )

  const entityTypeIds = Array.from(
    new Set(readSearchParamArray(searchParams, "entityTypeIds")),
  )

  const filters =
    entityNumber.length > 0 || state.length > 0 || entityTypeIds.length > 0
      ? {
          ...(entityNumber.length > 0 ? { entityNumber } : {}),
          ...(state.length > 0 ? { state } : {}),
          ...(entityTypeIds.length > 0 ? { entityTypeIds } : {}),
        }
      : undefined

  // Multi-column sort via `?sorts=`; absent → the list's entity-asc default.
  const parsedSorts = parseSortsParam(readSearchParam(searchParams, "sorts"))
  const sorts = parsedSorts.length > 0 ? parsedSorts : [ENTITIES_DEFAULT_SORT]

  return {
    search: searchRaw || undefined,
    sort: sorts[0],
    sorts,
    filters,
    page,
    pageSize: LIST_ENTITIES_PAGE_SIZE,
  }
}

function buildEntitiesListSearchString(
  input: ListInput<EntitiesListFilters>,
): string {
  const params = new URLSearchParams()
  // Encode the ordered sort list; a single `sort` is an array of one.
  const sorts = input.sorts?.length ? input.sorts : input.sort ? [input.sort] : []
  if (sorts.length > 0) params.set("sorts", encodeSortsParam(sorts))
  if (input.search) params.set("q", input.search)
  if (input.filters?.entityNumber) params.set("entityNumber", input.filters.entityNumber)
  for (const code of input.filters?.state ?? []) {
    params.append("state", code)
  }
  for (const typeId of input.filters?.entityTypeIds ?? []) {
    params.append("entityTypeIds", typeId)
  }
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listEntitiesRequest(
  input: ListInput<EntitiesListFilters>,
): Promise<ListOutput<EntityListRow>> {
  const queryString = buildEntitiesListSearchString(input)
  const url = queryString
    ? `/api/entities?${queryString}`
    : "/api/entities"
  return requestJson<ListOutput<EntityListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const ENTITIES_LIST_QUERY_KEY = [
  "entities",
  "list",
] as const
