import type { ListInput, ListOutput } from "@builders/application"
import type { WorkOrderListRow } from "@builders/domain"
import { requestJson } from "@/transport/http"

export type WorkOrdersListInput = ListInput<Record<string, never>>

export const WORK_ORDERS_LIST_QUERY_KEY = ["work-orders", "list"] as const

export const WORK_ORDERS_LIST_PAGE_SIZE = 50

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const raw = searchParams?.[key]
  return Array.isArray(raw) ? raw[0] : raw
}

export function parseWorkOrdersListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): WorkOrdersListInput {
  const search = (readSearchParam(searchParams, "q") ?? "").trim()
  const sortRaw = (readSearchParam(searchParams, "sort") ?? "").trim().toLowerCase()
  const direction: "asc" | "desc" = sortRaw === "desc" ? "desc" : "asc"
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1
  return {
    search: search || undefined,
    sort: { field: "workOrderNumber", direction },
    page,
    pageSize: WORK_ORDERS_LIST_PAGE_SIZE,
  }
}

function buildSearchString(input: WorkOrdersListInput): string {
  const params = new URLSearchParams()
  if (input.search) params.set("q", input.search)
  if (input.sort) params.set("sort", input.sort.direction)
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export type WorkOrdersListOutput = ListOutput<WorkOrderListRow>

export async function listWorkOrdersRequest(
  input: WorkOrdersListInput,
): Promise<WorkOrdersListOutput> {
  const queryString = buildSearchString(input)
  const url = queryString ? `/api/work-orders?${queryString}` : "/api/work-orders"
  const result = await requestJson<{ workOrders: WorkOrderListRow[] }>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
  return { rows: result.workOrders, total: result.workOrders.length }
}
