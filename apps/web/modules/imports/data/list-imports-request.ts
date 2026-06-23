import type { ImportsListFilters } from "@builders/application"
import type { ListInput, ListOutput } from "@builders/application"
import { LIST_IMPORTS_PAGE_SIZE, type ImportRow } from "@builders/domain"
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

export function parseImportsListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<ImportsListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const impNumberRaw = (readSearchParam(searchParams, "impNumber") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  const warehouseId = Array.from(
    new Set(readSearchParamArray(searchParams, "warehouseId")),
  )

  return {
    search: searchRaw || undefined,
    filters:
      impNumberRaw || warehouseId.length > 0
        ? {
            ...(impNumberRaw ? { impNumber: impNumberRaw } : {}),
            ...(warehouseId.length > 0 ? { warehouseId } : {}),
          }
        : undefined,
    page,
    pageSize: LIST_IMPORTS_PAGE_SIZE,
  }
}

export function buildImportsListSearchString(input: ListInput<ImportsListFilters>): string {
  const params = new URLSearchParams()
  if (input.search) params.set("q", input.search)
  if (input.filters?.impNumber) params.set("impNumber", input.filters.impNumber)
  for (const id of input.filters?.warehouseId ?? []) {
    params.append("warehouseId", id)
  }
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listImportsRequest(
  input: ListInput<ImportsListFilters>,
): Promise<ListOutput<ImportRow>> {
  const queryString = buildImportsListSearchString(input)
  const url = queryString ? `/api/imports?${queryString}` : "/api/imports"
  return requestJson<ListOutput<ImportRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const IMPORTS_LIST_QUERY_KEY = ["imports", "list"] as const
