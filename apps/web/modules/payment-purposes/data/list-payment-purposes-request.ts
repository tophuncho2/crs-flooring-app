import type {
  PaymentPurposesListFilters,
  ListInput,
  ListOutput,
} from "@builders/application"
import {
  LIST_PAYMENT_PURPOSES_PAGE_SIZE,
  type PaymentPurposeListRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const raw = searchParams?.[key]
  return Array.isArray(raw) ? raw[0] : raw
}

export function parsePaymentPurposesListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<PaymentPurposesListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const paymentPurposeNumberRaw = (
    readSearchParam(searchParams, "paymentPurposeNumber") ?? ""
  ).trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  return {
    search: searchRaw || undefined,
    filters: paymentPurposeNumberRaw ? { paymentPurposeNumber: paymentPurposeNumberRaw } : undefined,
    page,
    pageSize: LIST_PAYMENT_PURPOSES_PAGE_SIZE,
  }
}

export function buildPaymentPurposesListSearchString(
  input: ListInput<PaymentPurposesListFilters>,
): string {
  const params = new URLSearchParams()
  if (input.search) params.set("q", input.search)
  const paymentPurposeNumber = input.filters?.paymentPurposeNumber?.trim()
  if (paymentPurposeNumber) params.set("paymentPurposeNumber", paymentPurposeNumber)
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listPaymentPurposesRequest(
  input: ListInput<PaymentPurposesListFilters>,
): Promise<ListOutput<PaymentPurposeListRow>> {
  const queryString = buildPaymentPurposesListSearchString(input)
  const url = queryString ? `/api/payment-purposes?${queryString}` : "/api/payment-purposes"
  return requestJson<ListOutput<PaymentPurposeListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const PAYMENT_PURPOSES_LIST_QUERY_KEY = ["payment-purposes", "list"] as const
