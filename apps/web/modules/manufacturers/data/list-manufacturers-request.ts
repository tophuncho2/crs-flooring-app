import type {
  ListInput,
  ListOutput,
  ManufacturersListFilters,
} from "@builders/application"
import {
  LIST_MANUFACTURERS_PAGE_SIZE,
  type ManufacturerListRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const raw = searchParams?.[key]
  return Array.isArray(raw) ? raw[0] : raw
}

export function parseManufacturersListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<ManufacturersListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  return {
    search: searchRaw || undefined,
    page,
    pageSize: LIST_MANUFACTURERS_PAGE_SIZE,
  }
}

export function buildManufacturersListSearchString(
  input: ListInput<ManufacturersListFilters>,
): string {
  const params = new URLSearchParams()
  if (input.search) params.set("q", input.search)
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listManufacturersRequest(
  input: ListInput<ManufacturersListFilters>,
): Promise<ListOutput<ManufacturerListRow>> {
  const queryString = buildManufacturersListSearchString(input)
  const url = queryString ? `/api/manufacturers?${queryString}` : "/api/manufacturers"
  return requestJson<ListOutput<ManufacturerListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const MANUFACTURERS_LIST_QUERY_KEY = ["manufacturers", "list"] as const
