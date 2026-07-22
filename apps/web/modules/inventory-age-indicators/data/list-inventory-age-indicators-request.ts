import type {
  InventoryAgeIndicatorsListFilters,
  ListInput,
  ListOutput,
} from "@builders/application"
import {
  LIST_INVENTORY_AGE_INDICATORS_PAGE_SIZE,
  type InventoryAgeIndicatorListRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const raw = searchParams?.[key]
  return Array.isArray(raw) ? raw[0] : raw
}

// No filters or search — the list is locked to `days` ASC. Only pagination is
// carried in the URL.
export function parseInventoryAgeIndicatorsListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<InventoryAgeIndicatorsListFilters> {
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  return {
    filters: {},
    page,
    pageSize: LIST_INVENTORY_AGE_INDICATORS_PAGE_SIZE,
  }
}

export function buildInventoryAgeIndicatorsListSearchString(
  input: ListInput<InventoryAgeIndicatorsListFilters>,
): string {
  const params = new URLSearchParams()
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listInventoryAgeIndicatorsRequest(
  input: ListInput<InventoryAgeIndicatorsListFilters>,
): Promise<ListOutput<InventoryAgeIndicatorListRow>> {
  const queryString = buildInventoryAgeIndicatorsListSearchString(input)
  const url = queryString
    ? `/api/inventory-age-indicators?${queryString}`
    : "/api/inventory-age-indicators"
  return requestJson<ListOutput<InventoryAgeIndicatorListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const INVENTORY_AGE_INDICATORS_LIST_QUERY_KEY = [
  "inventory-age-indicators",
  "list",
] as const
