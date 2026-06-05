import type { ListInput, ListOutput, TemplatesListFilters } from "@builders/application"
import {
  LIST_TEMPLATES_PAGE_SIZE,
  type TemplateListRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

export const TEMPLATES_LIST_QUERY_KEY = ["templates", "list"] as const

const FILTER_KEYS = ["managementCompanyId", "propertyId"] as const
type FilterKey = (typeof FILTER_KEYS)[number]

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

export function parseTemplatesListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<TemplatesListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  const filterRecord: Partial<TemplatesListFilters> = {}
  for (const key of FILTER_KEYS) {
    const values = Array.from(new Set(readSearchParamArray(searchParams, key)))
    if (values.length > 0) filterRecord[key] = values
  }
  const hasAnyFilter = Object.keys(filterRecord).length > 0

  return {
    search: searchRaw || undefined,
    filters: hasAnyFilter ? (filterRecord as TemplatesListFilters) : undefined,
    page,
    pageSize: LIST_TEMPLATES_PAGE_SIZE,
  }
}

function buildTemplatesListSearchString(
  input: ListInput<TemplatesListFilters>,
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

export async function listTemplatesRequest(
  input: ListInput<TemplatesListFilters>,
): Promise<ListOutput<TemplateListRow>> {
  const queryString = buildTemplatesListSearchString(input)
  const url = queryString ? `/api/templates?${queryString}` : "/api/templates"
  return requestJson<ListOutput<TemplateListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}
