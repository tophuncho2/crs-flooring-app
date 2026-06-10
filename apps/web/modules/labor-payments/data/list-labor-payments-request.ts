import type {
  LaborPaymentsListFilters,
  ListInput,
  ListOutput,
} from "@builders/application"
import {
  LIST_LABOR_PAYMENTS_PAGE_SIZE,
  type LaborPaymentListRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const raw = searchParams?.[key]
  return Array.isArray(raw) ? raw[0] : raw
}

export function parseLaborPaymentsListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<LaborPaymentsListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const costRaw = (readSearchParam(searchParams, "cost") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  return {
    search: searchRaw || undefined,
    filters: costRaw ? { cost: [costRaw] } : {},
    page,
    pageSize: LIST_LABOR_PAYMENTS_PAGE_SIZE,
  }
}

export function buildLaborPaymentsListSearchString(
  input: ListInput<LaborPaymentsListFilters>,
): string {
  const params = new URLSearchParams()
  if (input.search) params.set("q", input.search)
  const cost = input.filters?.cost?.[0]
  if (cost) params.set("cost", cost)
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listLaborPaymentsRequest(
  input: ListInput<LaborPaymentsListFilters>,
): Promise<ListOutput<LaborPaymentListRow>> {
  const queryString = buildLaborPaymentsListSearchString(input)
  const url = queryString ? `/api/labor-payments?${queryString}` : "/api/labor-payments"
  return requestJson<ListOutput<LaborPaymentListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const LABOR_PAYMENTS_LIST_QUERY_KEY = ["labor-payments", "list"] as const
