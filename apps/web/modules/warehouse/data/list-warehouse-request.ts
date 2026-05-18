import type {
  ListInput,
  ListOutput,
  WarehousesListFilters,
} from "@builders/application"
import {
  LIST_WAREHOUSES_PAGE_SIZE,
  type WarehouseListRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const raw = searchParams?.[key]
  return Array.isArray(raw) ? raw[0] : raw
}

export function parseWarehousesListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<WarehousesListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  return {
    search: searchRaw || undefined,
    page,
    pageSize: LIST_WAREHOUSES_PAGE_SIZE,
  }
}

export function buildWarehousesListSearchString(
  input: ListInput<WarehousesListFilters>,
): string {
  const params = new URLSearchParams()
  if (input.search) params.set("q", input.search)
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listWarehousesRequest(
  input: ListInput<WarehousesListFilters>,
): Promise<ListOutput<WarehouseListRow>> {
  const queryString = buildWarehousesListSearchString(input)
  const url = queryString ? `/api/warehouses?${queryString}` : "/api/warehouses"
  return requestJson<ListOutput<WarehouseListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const WAREHOUSE_LIST_QUERY_KEY = ["warehouses", "list"] as const
