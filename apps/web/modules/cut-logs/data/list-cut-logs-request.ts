import type { ListInput, ListOutput } from "@builders/application"
import {
  CUT_LOGS_LIST_PAGE_SIZE,
  type CutLogListFilters,
  type InventoryCutLogRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

export const CUT_LOGS_LIST_QUERY_KEY = ["cut-logs", "list"] as const

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

export function parseCutLogsListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<CutLogListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  const warehouseId = Array.from(new Set(readSearchParamArray(searchParams, "warehouseId")))
  const filters: Partial<CutLogListFilters> = {}
  if (warehouseId.length > 0) filters.warehouseId = warehouseId

  const hasAnyFilter = Object.keys(filters).length > 0

  return {
    search: searchRaw || undefined,
    filters: hasAnyFilter ? (filters as CutLogListFilters) : undefined,
    page,
    pageSize: CUT_LOGS_LIST_PAGE_SIZE,
  }
}

function buildCutLogsListSearchString(input: ListInput<CutLogListFilters>): string {
  const params = new URLSearchParams()
  if (input.search) params.set("q", input.search)
  const values = (input.filters?.warehouseId ?? []) as ReadonlyArray<string>
  for (const id of values) params.append("warehouseId", id)
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listCutLogsRequest(
  input: ListInput<CutLogListFilters>,
): Promise<ListOutput<InventoryCutLogRow>> {
  const queryString = buildCutLogsListSearchString(input)
  const url = queryString ? `/api/cut-logs?${queryString}` : "/api/cut-logs"
  return requestJson<ListOutput<InventoryCutLogRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}
