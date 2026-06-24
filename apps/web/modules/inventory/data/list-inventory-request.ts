import type { InventoryListFilters, ListInput, ListOutput } from "@builders/application"
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

  const direction = readSearchParam(searchParams, "sort") === "asc" ? "asc" : "desc"
  const sortFieldRaw = readSearchParam(searchParams, "sortField")
  const field = INVENTORY_LIST_SORT_FIELDS.includes(
    sortFieldRaw as (typeof INVENTORY_LIST_SORT_FIELDS)[number],
  )
    ? (sortFieldRaw as string)
    : "createdAt"

  return {
    sort: { field, direction },
    filters: hasAnyFilter ? (filterRecord as InventoryListFilters) : undefined,
    page,
    pageSize: LIST_INVENTORY_PAGE_SIZE,
  }
}

export function buildInventoryListSearchString(
  input: ListInput<InventoryListFilters>,
): string {
  const params = new URLSearchParams()
  if (input.sort?.direction) params.set("sort", input.sort.direction)
  if (input.sort?.field) params.set("sortField", input.sort.field)
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
