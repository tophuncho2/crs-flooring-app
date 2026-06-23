import type {
  ListInput,
  ListOutput,
  PropertiesListFilters,
} from "@builders/application"
import { LIST_PROPERTIES_PAGE_SIZE, type PropertyListRow } from "@builders/domain"
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

export function parsePropertiesListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<PropertiesListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  const propNumber = (readSearchParam(searchParams, "propNumber") ?? "").trim()

  const managementCompanyId = Array.from(
    new Set(readSearchParamArray(searchParams, "managementCompanyId")),
  )

  const state = Array.from(
    new Set(
      readSearchParamArray(searchParams, "state")
        .map((entry) => entry.toUpperCase())
        .filter((entry) => /^[A-Z]{2}$/.test(entry)),
    ),
  )

  const filters =
    propNumber.length > 0 || managementCompanyId.length > 0 || state.length > 0
      ? {
          ...(propNumber.length > 0 ? { propNumber } : {}),
          ...(managementCompanyId.length > 0 ? { managementCompanyId } : {}),
          ...(state.length > 0 ? { state } : {}),
        }
      : undefined

  return {
    search: searchRaw || undefined,
    filters,
    page,
    pageSize: LIST_PROPERTIES_PAGE_SIZE,
  }
}

function buildPropertiesListSearchString(
  input: ListInput<PropertiesListFilters>,
): string {
  const params = new URLSearchParams()
  if (input.search) params.set("q", input.search)
  if (input.filters?.propNumber) params.set("propNumber", input.filters.propNumber)
  for (const id of input.filters?.managementCompanyId ?? []) {
    params.append("managementCompanyId", id)
  }
  for (const code of input.filters?.state ?? []) {
    params.append("state", code)
  }
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listPropertiesRequest(
  input: ListInput<PropertiesListFilters>,
): Promise<ListOutput<PropertyListRow>> {
  const queryString = buildPropertiesListSearchString(input)
  const url = queryString ? `/api/properties?${queryString}` : "/api/properties"
  return requestJson<ListOutput<PropertyListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const PROPERTIES_LIST_QUERY_KEY = ["properties", "list"] as const
