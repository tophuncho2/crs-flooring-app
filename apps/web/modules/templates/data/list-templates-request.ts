import type {
  ListInput,
  ListOutput,
  ListSort,
  TemplatesListFilters,
} from "@builders/application"
import {
  LIST_TEMPLATES_PAGE_SIZE,
  type TemplateListRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

export const TEMPLATES_LIST_QUERY_KEY = ["templates", "list"] as const

const FILTER_KEYS = ["entityId", "propertyId", "unitType", "description"] as const

/**
 * Sort fields recognised by the templates list. Mirrors the API validator
 * allowlist and the toolbar Sort menu. The list defaults to `property ASC` when
 * no `?sorts=` is present; any unknown field is dropped.
 */
export const TEMPLATES_LIST_SORT_FIELDS = [
  "property",
  "entity",
  "unitType",
  "createdAt",
  "updatedAt",
] as const satisfies readonly string[]

/** Cap on user-selected sort columns — mirrors the engine + API + use case. */
const TEMPLATES_MAX_SORT_LEVELS = 3

/** The list's default order when the URL carries no `?sorts=` (preserve property A→Z). */
const TEMPLATES_DEFAULT_SORT: ListSort = { field: "property", direction: "asc" }

function isAllowedSortField(value: string): boolean {
  return (TEMPLATES_LIST_SORT_FIELDS as readonly string[]).includes(value)
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
    if (result.length >= TEMPLATES_MAX_SORT_LEVELS) break
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

export function parseTemplatesListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<TemplatesListFilters> {
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  const filterRecord: Partial<TemplatesListFilters> = {}
  for (const key of FILTER_KEYS) {
    const values = Array.from(new Set(readSearchParamArray(searchParams, key)))
    if (values.length > 0) filterRecord[key] = values
  }
  const hasAnyFilter = Object.keys(filterRecord).length > 0

  // Multi-column sort via `?sorts=`; absent → the list's property-asc default.
  const parsedSorts = parseSortsParam(readSearchParam(searchParams, "sorts"))
  const sorts = parsedSorts.length > 0 ? parsedSorts : [TEMPLATES_DEFAULT_SORT]

  return {
    sort: sorts[0],
    sorts,
    filters: hasAnyFilter ? (filterRecord as TemplatesListFilters) : undefined,
    page,
    pageSize: LIST_TEMPLATES_PAGE_SIZE,
  }
}

function buildTemplatesListSearchString(
  input: ListInput<TemplatesListFilters>,
): string {
  const params = new URLSearchParams()
  // Encode the ordered sort list; a single `sort` is an array of one.
  const sorts = input.sorts?.length ? input.sorts : input.sort ? [input.sort] : []
  if (sorts.length > 0) params.set("sorts", encodeSortsParam(sorts))
  for (const key of FILTER_KEYS) {
    const values = (input.filters?.[key] ?? []) as ReadonlyArray<string>
    for (const id of values) params.append(key, id)
  }
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listTemplatesRequest(
  input: ListInput<TemplatesListFilters>,
): Promise<ListOutput<TemplateListRow>> {
  const queryString = buildTemplatesListSearchString(input)
  const url = queryString ? `/api/templates?${queryString}` : "/api/templates"
  return requestJson<ListOutput<TemplateListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}
