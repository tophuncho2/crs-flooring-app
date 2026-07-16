import type {
  WorkOrderDocumentTypesListFilters,
  ListInput,
  ListOutput,
} from "@builders/application"
import {
  LIST_WORK_ORDER_DOCUMENT_TYPES_PAGE_SIZE,
  type WorkOrderDocumentTypeListRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const raw = searchParams?.[key]
  return Array.isArray(raw) ? raw[0] : raw
}

export function parseWorkOrderDocumentTypesListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<WorkOrderDocumentTypesListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const workOrderDocumentTypeNumberRaw = (
    readSearchParam(searchParams, "workOrderDocumentTypeNumber") ?? ""
  ).trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  return {
    search: searchRaw || undefined,
    filters: workOrderDocumentTypeNumberRaw
      ? { workOrderDocumentTypeNumber: workOrderDocumentTypeNumberRaw }
      : undefined,
    page,
    pageSize: LIST_WORK_ORDER_DOCUMENT_TYPES_PAGE_SIZE,
  }
}

export function buildWorkOrderDocumentTypesListSearchString(
  input: ListInput<WorkOrderDocumentTypesListFilters>,
): string {
  const params = new URLSearchParams()
  if (input.search) params.set("q", input.search)
  const workOrderDocumentTypeNumber = input.filters?.workOrderDocumentTypeNumber?.trim()
  if (workOrderDocumentTypeNumber)
    params.set("workOrderDocumentTypeNumber", workOrderDocumentTypeNumber)
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listWorkOrderDocumentTypesRequest(
  input: ListInput<WorkOrderDocumentTypesListFilters>,
): Promise<ListOutput<WorkOrderDocumentTypeListRow>> {
  const queryString = buildWorkOrderDocumentTypesListSearchString(input)
  const url = queryString
    ? `/api/work-order-document-types?${queryString}`
    : "/api/work-order-document-types"
  return requestJson<ListOutput<WorkOrderDocumentTypeListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const WORK_ORDER_DOCUMENT_TYPES_LIST_QUERY_KEY = [
  "work-order-document-types",
  "list",
] as const
