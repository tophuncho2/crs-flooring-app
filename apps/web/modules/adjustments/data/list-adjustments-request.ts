import type { ListInput, ListOutput, ListSort } from "@builders/application"
import {
  INVENTORY_ADJUSTMENTS_LIST_PAGE_SIZE,
  type InventoryAdjustmentListFilters,
  type EnrichedInventoryAdjustmentRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

export const ADJUSTMENTS_LIST_QUERY_KEY = ["adjustments", "list"] as const

/**
 * Sort fields recognised by the adjustments list. Mirrors the API validator enum
 * and the Sort menu options; `createdAt` is the default. Any other value is
 * dropped. Kept independent of the API allowlist for defense-in-depth (the
 * sort-allowlist-sync test asserts they stay identical).
 */
export const ADJUSTMENTS_LIST_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "location",
  "productName",
] as const

/** Cap on user-selected sort columns — mirrors the engine + API + use case. */
const ADJUSTMENTS_MAX_SORT_LEVELS = 3

function isAllowedSortField(value: string): boolean {
  return (ADJUSTMENTS_LIST_SORT_FIELDS as readonly string[]).includes(value)
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
    if (result.length >= ADJUSTMENTS_MAX_SORT_LEVELS) break
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

// Multi-value (repeated) filter params — entity-id chips. Shared by parse +
// build.
const MULTI_VALUE_FILTER_KEYS = [
  "warehouseId",
  "categoryId",
  "productId",
] as const
// Scalar free-text filter params — the identity search bars. Shared by parse +
// build so the URL contract stays in one place. (adjNumber/invNumber resolve to
// exact integer matches server-side; roll/dye/note stay substring.)
const TEXT_FILTER_KEYS = ["adjNumber", "invNumber", "rollNumber", "dyeLot", "note"] as const

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

  const hasAnyFilter = Object.keys(filters).length > 0

  // Ordered multi-column sort via `?sorts=`. With no sort param the list falls
  // back to the server's uniform base order (createdAt desc, id desc) — pass
  // empty so the SSR key matches the client's de-seeded first render.
  const sorts = parseSortsParam(readSearchParam(searchParams, "sorts"))

  return {
    ...(sorts.length > 0 ? { sort: sorts[0], sorts } : {}),
    filters: hasAnyFilter ? (filters as InventoryAdjustmentListFilters) : undefined,
    page,
    pageSize: INVENTORY_ADJUSTMENTS_LIST_PAGE_SIZE,
  }
}

export function buildAdjustmentsListSearchString(
  input: ListInput<InventoryAdjustmentListFilters>,
): string {
  const params = new URLSearchParams()
  // Emit the ordered `?sorts=` param (canonical) so the API receives the
  // user-selected sort; single-sort consumers coerce through the same encoder.
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
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

/**
 * Build the query string the CSV export POSTs — the same filter + `?sorts=`
 * encoding as the list read, minus pagination (the server caps the row count).
 * Mirrors `buildInventoryExportQuery`.
 */
export function buildAdjustmentsExportQuery(
  input: ListInput<InventoryAdjustmentListFilters>,
): string {
  const params = new URLSearchParams(buildAdjustmentsListSearchString({ ...input, page: 1 }))
  params.delete("page")
  params.delete("pageSize")
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
