import type {
  ListInput,
  ListOutput,
  ListSort,
  PropertiesListFilters,
} from "@builders/application"
import { LIST_PROPERTIES_PAGE_SIZE, type PropertyListRow } from "@builders/domain"
import { requestJson } from "@/transport/http"

/**
 * Sort fields recognised by the properties list. Mirrors the API validator
 * allowlist and the toolbar Sort menu. The list defaults to `name ASC` when no
 * `?sorts=` is present; any unknown field is dropped.
 */
export const PROPERTIES_LIST_SORT_FIELDS = [
  "name",
  "entity",
  "createdAt",
  "updatedAt",
] as const satisfies readonly string[]

/** Cap on user-selected sort columns — mirrors the engine + API + use case. */
const PROPERTIES_MAX_SORT_LEVELS = 3

function isAllowedSortField(value: string): boolean {
  return (PROPERTIES_LIST_SORT_FIELDS as readonly string[]).includes(value)
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
    if (result.length >= PROPERTIES_MAX_SORT_LEVELS) break
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

export function parsePropertiesListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<PropertiesListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  const propNumber = (readSearchParam(searchParams, "propNumber") ?? "").trim()

  const entityId = Array.from(
    new Set(readSearchParamArray(searchParams, "entityId")),
  )

  const state = Array.from(
    new Set(
      readSearchParamArray(searchParams, "state")
        .map((entry) => entry.toUpperCase())
        .filter((entry) => /^[A-Z]{2}$/.test(entry)),
    ),
  )

  const filters =
    propNumber.length > 0 || entityId.length > 0 || state.length > 0
      ? {
          ...(propNumber.length > 0 ? { propNumber } : {}),
          ...(entityId.length > 0 ? { entityId } : {}),
          ...(state.length > 0 ? { state } : {}),
        }
      : undefined

  // Multi-column sort via `?sorts=`. With no sort param the list falls back to
  // the server's uniform base order (createdAt desc, id desc) — pass empty so the
  // SSR key matches the client's de-seeded first render (nothing reads as sorted).
  const sorts = parseSortsParam(readSearchParam(searchParams, "sorts"))

  return {
    search: searchRaw || undefined,
    ...(sorts.length > 0 ? { sort: sorts[0], sorts } : {}),
    filters,
    page,
    pageSize: LIST_PROPERTIES_PAGE_SIZE,
  }
}

function buildPropertiesListSearchString(
  input: ListInput<PropertiesListFilters>,
): string {
  const params = new URLSearchParams()
  // Encode the ordered sort list; a single `sort` is an array of one.
  const sorts = input.sorts?.length ? input.sorts : input.sort ? [input.sort] : []
  if (sorts.length > 0) params.set("sorts", encodeSortsParam(sorts))
  if (input.search) params.set("q", input.search)
  if (input.filters?.propNumber) params.set("propNumber", input.filters.propNumber)
  for (const id of input.filters?.entityId ?? []) {
    params.append("entityId", id)
  }
  for (const code of input.filters?.state ?? []) {
    params.append("state", code)
  }
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listPropertiesRequest(
  input: ListInput<PropertiesListFilters>,
): Promise<ListOutput<PropertyListRow>> {
  const queryString = buildPropertiesListSearchString(input)
  const url = queryString ? `/api/properties?${queryString}` : "/api/properties"
  return requestJson<ListOutput<PropertyListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const PROPERTIES_LIST_QUERY_KEY = ["properties", "list"] as const
