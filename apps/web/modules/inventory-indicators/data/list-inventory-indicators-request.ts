import type { ListInput, ListOutput, ListSort } from "@builders/application"
import {
  INVENTORY_INDICATORS_LIST_PAGE_SIZE,
  type InventoryIndicatorListFilters,
  type InventoryIndicatorRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

export const INDICATORS_LIST_QUERY_KEY = ["inventory-indicators", "list"] as const

/**
 * Sort fields recognised by the indicators list. Mirrors the API validator enum
 * and the Sort menu options; `createdAt` is the default. Kept independent of the
 * API allowlist for defense-in-depth.
 */
export const INDICATORS_LIST_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "productName",
  "warehouseName",
] as const

const INDICATORS_MAX_SORT_LEVELS = 3

function isAllowedSortField(value: string): boolean {
  return (INDICATORS_LIST_SORT_FIELDS as readonly string[]).includes(value)
}

function parseSortsParam(raw: string | undefined): ListSort[] {
  if (!raw) return []
  const result: ListSort[] = []
  const seen = new Set<string>()
  for (const token of raw.split(",")) {
    const [field, direction] = token.split(":")
    if (!field || seen.has(field) || !isAllowedSortField(field)) continue
    seen.add(field)
    result.push({ field, direction: direction === "asc" ? "asc" : "desc" })
    if (result.length >= INDICATORS_MAX_SORT_LEVELS) break
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

const MULTI_VALUE_FILTER_KEYS = ["warehouseId", "productId"] as const
const TEXT_FILTER_KEYS = ["indicatorNumber"] as const

export function parseIndicatorsListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<InventoryIndicatorListFilters> {
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  const filters: Partial<InventoryIndicatorListFilters> = {}
  for (const key of MULTI_VALUE_FILTER_KEYS) {
    const values = Array.from(new Set(readSearchParamArray(searchParams, key)))
    if (values.length > 0) filters[key] = values
  }
  for (const key of TEXT_FILTER_KEYS) {
    const value = (readSearchParam(searchParams, key) ?? "").trim()
    if (value.length > 0) filters[key] = value
  }

  const hasAnyFilter = Object.keys(filters).length > 0

  // With no sort param the list falls back to the server's uniform base order
  // (createdAt desc, id desc) — pass empty so the SSR key matches the client's
  // de-seeded first render.
  const sorts = parseSortsParam(readSearchParam(searchParams, "sorts"))

  return {
    ...(sorts.length > 0 ? { sort: sorts[0], sorts } : {}),
    filters: hasAnyFilter ? (filters as InventoryIndicatorListFilters) : undefined,
    page,
    pageSize: INVENTORY_INDICATORS_LIST_PAGE_SIZE,
  }
}

export function buildIndicatorsListSearchString(
  input: ListInput<InventoryIndicatorListFilters>,
): string {
  const params = new URLSearchParams()
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

export async function listIndicatorsRequest(
  input: ListInput<InventoryIndicatorListFilters>,
): Promise<ListOutput<InventoryIndicatorRow>> {
  const queryString = buildIndicatorsListSearchString(input)
  const url = queryString ? `/api/inventory-indicators?${queryString}` : "/api/inventory-indicators"
  return requestJson<ListOutput<InventoryIndicatorRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}
