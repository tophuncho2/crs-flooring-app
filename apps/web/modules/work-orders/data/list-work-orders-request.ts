import type { WorkOrdersListFilters } from "@builders/application"
import type { ListInput, ListOutput } from "@builders/application"
import type { WorkOrderListRow } from "@builders/domain"
import { requestJson } from "@/transport/http"

export type WorkOrdersListInput = ListInput<WorkOrdersListFilters>

export const WORK_ORDERS_LIST_QUERY_KEY = ["work-orders", "list"] as const

export const WORK_ORDERS_LIST_PAGE_SIZE = 50

/**
 * Filterable field keys recognised by the work-orders list. Each ID
 * filter is a multi-value URL param (`?managementCompanyId=a&managementCompanyId=b`);
 * the UI currently exposes single-select chips but the contract is multi-value.
 */
export const WORK_ORDERS_LIST_FILTERABLE_FIELDS = [
  "managementCompanyId",
  "propertyId",
  "templateId",
  "warehouseId",
  "jobTypeId",
  "scheduledForStart",
  "scheduledForEnd",
] as const satisfies readonly string[]

/**
 * Sort fields recognised by the work-orders list. Mirrors the API validator enum
 * and the toolbar sort chip; `createdAt` is the default. Any other value falls back
 * to `createdAt`.
 */
const WORK_ORDERS_LIST_SORT_FIELDS = [
  "createdAt",
  "scheduledFor",
  "property",
  "managementCompany",
  "workOrderNumber",
] as const satisfies readonly string[]

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
  const search = (readSearchParam(searchParams, "q") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1
  const direction = readSearchParam(searchParams, "sort") === "asc" ? "asc" : "desc"
  const sortFieldRaw = readSearchParam(searchParams, "sortField")
  const field = WORK_ORDERS_LIST_SORT_FIELDS.includes(
    sortFieldRaw as (typeof WORK_ORDERS_LIST_SORT_FIELDS)[number],
  )
    ? (sortFieldRaw as string)
    : "createdAt"
  return {
    search: search || undefined,
    sort: { field, direction },
    filters: readFiltersFromSearchParams(searchParams),
    page,
    pageSize: WORK_ORDERS_LIST_PAGE_SIZE,
  }
}

function buildSearchString(input: WorkOrdersListInput): string {
  const params = new URLSearchParams()
  if (input.search) params.set("q", input.search)
  if (input.sort?.direction) params.set("sort", input.sort.direction)
  if (input.sort?.field) params.set("sortField", input.sort.field)
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
