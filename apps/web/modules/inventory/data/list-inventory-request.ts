import type { InventoryListFilters, ListInput, ListOutput } from "@builders/application"
import {
  LIST_INVENTORY_PAGE_SIZE,
  type InventoryRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

export const INVENTORY_LIST_QUERY_KEY = ["inventory", "list"] as const

const FILTER_KEYS = ["warehouseId", "categoryId", "productId"] as const

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

export function parseInventoryListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<InventoryListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  const filterRecord: Partial<InventoryListFilters> = {}
  for (const key of FILTER_KEYS) {
    const values = Array.from(new Set(readSearchParamArray(searchParams, key)))
    if (values.length > 0) filterRecord[key] = values
  }
  const hasAnyFilter = Object.keys(filterRecord).length > 0

  return {
    search: searchRaw || undefined,
    filters: hasAnyFilter ? (filterRecord as InventoryListFilters) : undefined,
    page,
    pageSize: LIST_INVENTORY_PAGE_SIZE,
  }
}

export function buildInventoryListSearchString(
  input: ListInput<InventoryListFilters>,
): string {
  const params = new URLSearchParams()
  if (input.search) params.set("q", input.search)
  for (const key of FILTER_KEYS) {
    const values = (input.filters?.[key] ?? []) as ReadonlyArray<string>
    for (const id of values) params.append(key, id)
  }
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
