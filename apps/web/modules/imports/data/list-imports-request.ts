import type { ImportsListFilters } from "@builders/application"
import type { ListInput, ListOutput, ListSort } from "@builders/application"
import { LIST_IMPORTS_PAGE_SIZE, type ImportRow } from "@builders/domain"
import { requestJson } from "@/transport/http"

/**
 * Sort fields recognised by the imports list. Mirrors the API validator
 * allowlist and the toolbar Sort menu. The list defaults to `createdAt DESC`
 * when no `?sorts=` is present; any unknown field is dropped.
 */
export const IMPORTS_LIST_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
] as const satisfies readonly string[]

/** Cap on user-selected sort columns — mirrors the engine + API + use case. */
const IMPORTS_MAX_SORT_LEVELS = 3

/** The list's default order when the URL carries no `?sorts=` (newest first). */
const IMPORTS_DEFAULT_SORT: ListSort = { field: "createdAt", direction: "desc" }

function isAllowedSortField(value: string): boolean {
  return (IMPORTS_LIST_SORT_FIELDS as readonly string[]).includes(value)
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
    result.push({ field, direction: direction === "asc" ? "asc" : "desc" })
    if (result.length >= IMPORTS_MAX_SORT_LEVELS) break
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

export function parseImportsListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<ImportsListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const impNumberRaw = (readSearchParam(searchParams, "impNumber") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  const warehouseId = Array.from(
    new Set(readSearchParamArray(searchParams, "warehouseId")),
  )

  // Multi-column sort via `?sorts=`; absent → the list's createdAt-desc default.
  const parsedSorts = parseSortsParam(readSearchParam(searchParams, "sorts"))
  const sorts = parsedSorts.length > 0 ? parsedSorts : [IMPORTS_DEFAULT_SORT]

  return {
    search: searchRaw || undefined,
    sort: sorts[0],
    sorts,
    filters:
      impNumberRaw || warehouseId.length > 0
        ? {
            ...(impNumberRaw ? { impNumber: impNumberRaw } : {}),
            ...(warehouseId.length > 0 ? { warehouseId } : {}),
          }
        : undefined,
    page,
    pageSize: LIST_IMPORTS_PAGE_SIZE,
  }
}

export function buildImportsListSearchString(input: ListInput<ImportsListFilters>): string {
  const params = new URLSearchParams()
  // Encode the ordered sort list; a single `sort` is an array of one.
  const sorts = input.sorts?.length ? input.sorts : input.sort ? [input.sort] : []
  if (sorts.length > 0) params.set("sorts", encodeSortsParam(sorts))
  if (input.search) params.set("q", input.search)
  if (input.filters?.impNumber) params.set("impNumber", input.filters.impNumber)
  for (const id of input.filters?.warehouseId ?? []) {
    params.append("warehouseId", id)
  }
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listImportsRequest(
  input: ListInput<ImportsListFilters>,
): Promise<ListOutput<ImportRow>> {
  const queryString = buildImportsListSearchString(input)
  const url = queryString ? `/api/imports?${queryString}` : "/api/imports"
  return requestJson<ListOutput<ImportRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const IMPORTS_LIST_QUERY_KEY = ["imports", "list"] as const
