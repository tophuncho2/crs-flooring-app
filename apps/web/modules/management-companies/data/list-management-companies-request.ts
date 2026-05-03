import type {
  ListInput,
  ListOutput,
  ManagementCompaniesListFilters,
} from "@builders/application"
import {
  LIST_MANAGEMENT_COMPANIES_PAGE_SIZE,
  type ManagementCompanyListRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const raw = searchParams?.[key]
  return Array.isArray(raw) ? raw[0] : raw
}

export function parseManagementCompaniesListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<ManagementCompaniesListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  return {
    search: searchRaw || undefined,
    page,
    pageSize: LIST_MANAGEMENT_COMPANIES_PAGE_SIZE,
  }
}

export function buildManagementCompaniesListSearchString(
  input: ListInput<ManagementCompaniesListFilters>,
): string {
  const params = new URLSearchParams()
  if (input.search) params.set("q", input.search)
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listManagementCompaniesRequest(
  input: ListInput<ManagementCompaniesListFilters>,
): Promise<ListOutput<ManagementCompanyListRow>> {
  const queryString = buildManagementCompaniesListSearchString(input)
  const url = queryString
    ? `/api/management-companies?${queryString}`
    : "/api/management-companies"
  return requestJson<ListOutput<ManagementCompanyListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const MANAGEMENT_COMPANIES_LIST_QUERY_KEY = [
  "management-companies",
  "list",
] as const
