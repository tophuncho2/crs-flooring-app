"use client"

import type { LaborPayment, LaborPaymentPage } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const CONTACT_LABOR_PAYMENTS_QUERY_KEY = ["contacts", "labor-payments"] as const

type LaborPaymentsPageResponse = {
  page: LaborPaymentPage
}

/** Paginated read of one contact's labor payments (record-view section). */
export async function contactLaborPaymentsPageRequest(
  contactId: string,
  skip: number,
  take: number,
  signal: AbortSignal | undefined,
): Promise<LaborPaymentPage> {
  const params = new URLSearchParams()
  if (skip > 0) params.set("skip", String(skip))
  params.set("take", String(take))
  const result = await requestJson<LaborPaymentsPageResponse>(
    `/api/contacts/${contactId}/labor-payments?${params.toString()}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    },
  )
  return result.page
}

/**
 * Fetch a single labor payment by id. Resolves a deep-linked payment
 * (`?laborPayment=<id>`) when the row isn't on the section's first loaded page.
 */
export async function laborPaymentByIdRequest(
  laborPaymentId: string,
  signal?: AbortSignal,
): Promise<LaborPayment> {
  const result = await requestJson<{ laborPayment: LaborPayment }>(
    `/api/labor-payments/${laborPaymentId}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    },
  )
  return result.laborPayment
}
