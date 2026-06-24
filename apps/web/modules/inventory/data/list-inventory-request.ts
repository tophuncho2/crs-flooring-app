import type { InventoryListFilters, ListInput, ListOutput, ListSort } from "@builders/application"
import {
  LIST_INVENTORY_PAGE_SIZE,
  type InventoryRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

export const INVENTORY_LIST_QUERY_KEY = ["inventory", "list"] as const

// Multi-value filter keys shared by parse + build. ID-shaped keys
// (`warehouseId`/`categoryId`/`productId`) and the import#/PO# picker-chip
// strings (both `importNumber` and `purchaseOrderNumber` resolve through the
// import-entry link) all encode as repeated URL params with the same wire
// shape, so they share this list.
const MULTI_VALUE_FILTER_KEYS = [
  "warehouseId",
  "categoryId",
  "productId",
  "importNumber",
  "purchaseOrderNumber",
] as const

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

// Scalar free-text filter params — the four identity search bars. Shared by
// parse + build so the URL contract stays in one place.
const TEXT_FILTER_KEYS = ["invNumber", "rollNumber", "dyeLot", "note"] as const

/**
 * Sort fields recognised by the inventory list. Mirrors the API validator enum
 * and the sortable column headers; `createdAt` is the default. Row# is
 * intentionally not sortable. Any other value falls back to `createdAt`.
 */
const INVENTORY_LIST_SORT_FIELDS = ["createdAt", "location", "stockBalance"] as const

/** Cap on user-selected sort columns — mirrors the engine + API + use case. */
const INVENTORY_MAX_SORT_LEVELS = 3

function isAllowedSortField(value: string): boolean {
  return (INVENTORY_LIST_SORT_FIELDS as readonly string[]).includes(value)
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
    if (result.length >= INVENTORY_MAX_SORT_LEVELS) break
  }
  return result
}

function encodeSortsParam(sorts: readonly ListSort[]): string {
  return sorts.map((entry) => `${entry.field}:${entry.direction}`).join(",")
}

export function parseInventoryListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<InventoryListFilters> {
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  const locationRaw = (readSearchParam(searchParams, "location") ?? "").trim()
  const archivedRaw = readSearchParam(searchParams, "archived")
  const archived =
    archivedRaw === "true" ? true : archivedRaw === "false" ? false : undefined

  const filterRecord: Partial<InventoryListFilters> = {}
  for (const key of MULTI_VALUE_FILTER_KEYS) {
    const values = Array.from(new Set(readSearchParamArray(searchParams, key)))
    if (values.length > 0) filterRecord[key] = values
  }
  if (locationRaw.length > 0) filterRecord.location = locationRaw
  if (archived !== undefined) filterRecord.isArchived = archived
  for (const key of TEXT_FILTER_KEYS) {
    const value = (readSearchParam(searchParams, key) ?? "").trim()
    if (value.length > 0) filterRecord[key] = value
  }

  const hasAnyFilter = Object.keys(filterRecord).length > 0

  // Ordered multi-column sort is canonical via `?sorts=`; fall back to the legacy
  // single `?sort=`/`?sortField=` pair so old bookmarks keep working.
  const sorts = parseSortsParam(readSearchParam(searchParams, "sorts"))
  const direction = readSearchParam(searchParams, "sort") === "asc" ? "asc" : "desc"
  const sortFieldRaw = readSearchParam(searchParams, "sortField")
  const field = INVENTORY_LIST_SORT_FIELDS.includes(
    sortFieldRaw as (typeof INVENTORY_LIST_SORT_FIELDS)[number],
  )
    ? (sortFieldRaw as string)
    : "createdAt"
  const effectiveSorts: ListSort[] = sorts.length > 0 ? sorts : [{ field, direction }]

  return {
    sort: effectiveSorts[0],
    sorts: effectiveSorts,
    filters: hasAnyFilter ? (filterRecord as InventoryListFilters) : undefined,
    page,
    pageSize: LIST_INVENTORY_PAGE_SIZE,
  }
}

export function buildInventoryListSearchString(
  input: ListInput<InventoryListFilters>,
): string {
  const params = new URLSearchParams()
  // Emit the ordered `?sorts=` param (canonical). Single-sort consumers and old
  // bookmarks coerce through the same encoder so the wire shape stays uniform.
  const sorts = input.sorts?.length ? input.sorts : input.sort ? [input.sort] : []
  if (sorts.length > 0) params.set("sorts", encodeSortsParam(sorts))
  for (const key of MULTI_VALUE_FILTER_KEYS) {
    const values = (input.filters?.[key] ?? []) as ReadonlyArray<string>
    for (const id of values) params.append(key, id)
  }
  for (const key of TEXT_FILTER_KEYS) {
    const value = input.filters?.[key]?.trim()
    if (value && value.length > 0) params.set(key, value)
  }
  const location = input.filters?.location?.trim()
  if (location && location.length > 0) params.set("location", location)
  // Default-hide archived: only emit `archived` when explicitly set. Server
  // treats absent as "hide archived".
  if (input.filters?.isArchived === true) params.set("archived", "true")
  else if (input.filters?.isArchived === false) params.set("archived", "false")
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listInventoryRequest(
  input: ListInput<InventoryListFilters>,
): Promise<ListOutput<InventoryRow>> {
  const queryString = buildInventoryListSearchString(input)
  const url = queryString ? `/api/inventory?${queryString}` : "/api/inventory"
  return requestJson<ListOutput<InventoryRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}
