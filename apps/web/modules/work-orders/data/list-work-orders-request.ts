import type { WorkOrdersListFilters } from "@builders/application"
import type { ListInput, ListOutput, ListSort } from "@builders/application"
import type { WorkOrderListRow } from "@builders/domain"
import { requestJson } from "@/transport/http"

export type WorkOrdersListInput = ListInput<WorkOrdersListFilters>

export const WORK_ORDERS_LIST_QUERY_KEY = ["work-orders", "list"] as const

export const WORK_ORDERS_LIST_PAGE_SIZE = 50

/**
 * Filterable field keys recognised by the work-orders list. Each ID
 * filter is a multi-value URL param (`?entityId=a&entityId=b`);
 * the UI currently exposes single-select chips but the contract is multi-value.
 */
export const WORK_ORDERS_LIST_FILTERABLE_FIELDS = [
  "entityId",
  "propertyId",
  "templateId",
  "warehouseId",
  "jobTypeId",
  "unitType",
  "unitNumber",
  "workOrderNumber",
  "description",
  "vacancy",
  "scheduledForStart",
  "scheduledForEnd",
] as const satisfies readonly string[]

/**
 * Sort fields recognised by the work-orders list. Mirrors the API validator enum
 * and the toolbar sort chip; `createdAt` is the default. Any other value falls back
 * to `createdAt`.
 */
export const WORK_ORDERS_LIST_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "scheduledFor",
  "timeOfDay",
  "property",
  "entity",
  "warehouse",
  "jobType",
] as const satisfies readonly string[]

/** Cap on user-selected sort columns — mirrors the engine + API + use case. */
const WORK_ORDERS_MAX_SORT_LEVELS = 3

function isAllowedSortField(value: string): boolean {
  return (WORK_ORDERS_LIST_SORT_FIELDS as readonly string[]).includes(value)
}

/** Parse the ordered `?sorts=field:dir,field:dir` param (validated, deduped, capped). */
function parseSortsParam(raw: string | undefined): ListSort[] {
  if (!raw) return []
  const result: ListSort[] = []
  const seen = new Set<string>()
  for (const token of raw.split(",")) {
    const [field, direction] = token.split(":")
    if (!field || seen.has(field) || !isAllowedSortField(field)) continue
    seen.add(field)
    result.push({ field, direction: direction === "asc" ? "asc" : "desc" })
    if (result.length >= WORK_ORDERS_MAX_SORT_LEVELS) break
  }
  return result
}

function encodeSortsParam(sorts: readonly ListSort[]): string {
  return sorts.map((entry) => `${entry.field}:${entry.direction}`).join(",")
}

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const raw = searchParams?.[key]
  return Array.isArray(raw) ? raw[0] : raw
}

function readMultiSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string[] {
  const raw = searchParams?.[key]
  if (Array.isArray(raw)) return raw.filter((value): value is string => typeof value === "string")
  if (typeof raw === "string") return [raw]
  return []
}

function readFiltersFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): WorkOrdersListFilters {
  const result: Record<string, string[]> = {}
  for (const key of WORK_ORDERS_LIST_FILTERABLE_FIELDS) {
    const values = readMultiSearchParam(searchParams, key)
    if (values.length > 0) result[key] = values
  }
  return result as WorkOrdersListFilters
}

export function parseWorkOrdersListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): WorkOrdersListInput {
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  // Multi-column sort is canonical via `?sorts=`; fall back to the legacy
  // single `?sort=&sortField=` pair so shared/bookmarked links still resolve.
  const sorts = parseSortsParam(readSearchParam(searchParams, "sorts"))
  if (sorts.length > 0) {
    return {
      sort: sorts[0],
      sorts,
      filters: readFiltersFromSearchParams(searchParams),
      page,
      pageSize: WORK_ORDERS_LIST_PAGE_SIZE,
    }
  }

  const direction = readSearchParam(searchParams, "sort") === "asc" ? "asc" : "desc"
  const sortFieldRaw = readSearchParam(searchParams, "sortField")
  const field = WORK_ORDERS_LIST_SORT_FIELDS.includes(
    sortFieldRaw as (typeof WORK_ORDERS_LIST_SORT_FIELDS)[number],
  )
    ? (sortFieldRaw as string)
    : "createdAt"
  const fallbackSort: ListSort = { field, direction }
  return {
    sort: fallbackSort,
    sorts: [fallbackSort],
    filters: readFiltersFromSearchParams(searchParams),
    page,
    pageSize: WORK_ORDERS_LIST_PAGE_SIZE,
  }
}

function buildSearchString(input: WorkOrdersListInput): string {
  const params = new URLSearchParams()
  // Encode the ordered sort list; a single `sort` is an array of one.
  const sorts = input.sorts?.length ? input.sorts : input.sort ? [input.sort] : []
  if (sorts.length > 0) params.set("sorts", encodeSortsParam(sorts))
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  if (input.filters) {
    const filters = input.filters as Record<string, string[] | undefined>
    for (const key of WORK_ORDERS_LIST_FILTERABLE_FIELDS) {
      const values = filters[key] ?? []
      for (const value of values) params.append(key, value)
    }
  }
  return params.toString()
}

/**
 * Build the search string the CSV export POSTs as its `query` — the same
 * filter + sort wire shape as the list, minus pagination (the export ignores
 * page/pageSize and is capped server-side). Reuses the list encoder so the
 * exported scope matches the on-screen list exactly.
 */
export function buildWorkOrdersExportQuery(input: WorkOrdersListInput): string {
  const params = new URLSearchParams(buildSearchString({ ...input, page: 1 }))
  params.delete("page")
  params.delete("pageSize")
  return params.toString()
}

export type WorkOrdersListOutput = ListOutput<WorkOrderListRow>

export async function listWorkOrdersRequest(
  input: WorkOrdersListInput,
): Promise<WorkOrdersListOutput> {
  const queryString = buildSearchString(input)
  const url = queryString ? `/api/work-orders?${queryString}` : "/api/work-orders"
  const result = await requestJson<{ rows: WorkOrderListRow[]; total: number }>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
  return { rows: result.rows, total: result.total }
}
