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

export function parseManagementCompaniesListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<ManagementCompaniesListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  const state = Array.from(
    new Set(
      readSearchParamArray(searchParams, "state")
        .map((entry) => entry.toUpperCase())
        .filter((entry) => /^[A-Z]{2}$/.test(entry)),
    ),
  )

  const filters = state.length > 0 ? { state } : undefined

  return {
    search: searchRaw || undefined,
    filters,
    page,
    pageSize: LIST_MANAGEMENT_COMPANIES_PAGE_SIZE,
  }
}

export function buildManagementCompaniesListSearchString(
  input: ListInput<ManagementCompaniesListFilters>,
): string {
  const params = new URLSearchParams()
  if (input.search) params.set("q", input.search)
  for (const code of input.filters?.state ?? []) {
    params.append("state", code)
  }
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
