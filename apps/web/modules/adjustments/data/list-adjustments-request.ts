import type { ListInput, ListOutput } from "@builders/application"
import {
  INVENTORY_ADJUSTMENTS_LIST_PAGE_SIZE,
  type InventoryAdjustmentListFilters,
  type EnrichedInventoryAdjustmentRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

export const ADJUSTMENTS_LIST_QUERY_KEY = ["adjustments", "list"] as const

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

// Multi-value (repeated) filter params — entity-id chips + import-identity
// chips (PO#/import#, matched against the parent inventory). Shared by parse +
// build. `archived` (boolean) is handled separately below since its value type
// isn't a plain `string[]`.
const MULTI_VALUE_FILTER_KEYS = [
  "warehouseId",
  "categoryId",
  "productId",
  "importNumber",
  "purchaseOrderNumber",
] as const
// Scalar free-text filter params — the four identity search bars. Shared by
// parse + build so the URL contract stays in one place.
const TEXT_FILTER_KEYS = ["invNumber", "rollNumber", "dyeLot", "note"] as const

export function parseAdjustmentsListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<InventoryAdjustmentListFilters> {
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  const filters: Partial<InventoryAdjustmentListFilters> = {}
  for (const key of MULTI_VALUE_FILTER_KEYS) {
    const values = Array.from(new Set(readSearchParamArray(searchParams, key)))
    if (values.length > 0) filters[key] = values
  }
  for (const key of TEXT_FILTER_KEYS) {
    const value = (readSearchParam(searchParams, key) ?? "").trim()
    if (value.length > 0) filters[key] = value
  }

  const archivedRaw = readSearchParam(searchParams, "archived")
  if (archivedRaw === "true") filters.isArchived = true
  else if (archivedRaw === "false") filters.isArchived = false

  const hasAnyFilter = Object.keys(filters).length > 0

  return {
    filters: hasAnyFilter ? (filters as InventoryAdjustmentListFilters) : undefined,
    page,
    pageSize: INVENTORY_ADJUSTMENTS_LIST_PAGE_SIZE,
  }
}

function buildAdjustmentsListSearchString(input: ListInput<InventoryAdjustmentListFilters>): string {
  const params = new URLSearchParams()
  for (const key of MULTI_VALUE_FILTER_KEYS) {
    const values = (input.filters?.[key] ?? []) as ReadonlyArray<string>
    for (const id of values) params.append(key, id)
  }
  for (const key of TEXT_FILTER_KEYS) {
    const value = input.filters?.[key]?.trim()
    if (value && value.length > 0) params.set(key, value)
  }
  if (input.filters?.isArchived === true) params.set("archived", "true")
  else if (input.filters?.isArchived === false) params.set("archived", "false")
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listAdjustmentsRequest(
  input: ListInput<InventoryAdjustmentListFilters>,
): Promise<ListOutput<EnrichedInventoryAdjustmentRow>> {
  const queryString = buildAdjustmentsListSearchString(input)
  const url = queryString ? `/api/adjustments?${queryString}` : "/api/adjustments"
  return requestJson<ListOutput<EnrichedInventoryAdjustmentRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}
