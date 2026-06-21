import type { ListInput, ListOutput, PaymentsListFilters } from "@builders/application"
import { LIST_PAYMENTS_PAGE_SIZE, type PaymentListRow } from "@builders/domain"
import { requestJson } from "@/transport/http"

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const raw = searchParams?.[key]
  return Array.isArray(raw) ? raw[0] : raw
}

export function parsePaymentsListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<PaymentsListFilters> {
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  return {
    filters: {},
    page,
    pageSize: LIST_PAYMENTS_PAGE_SIZE,
  }
}

export function buildPaymentsListSearchString(input: ListInput<PaymentsListFilters>): string {
  const params = new URLSearchParams()
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listPaymentsRequest(
  input: ListInput<PaymentsListFilters>,
): Promise<ListOutput<PaymentListRow>> {
  const queryString = buildPaymentsListSearchString(input)
  const url = queryString ? `/api/payments?${queryString}` : "/api/payments"
  return requestJson<ListOutput<PaymentListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const PAYMENTS_LIST_QUERY_KEY = ["payments", "list"] as const
