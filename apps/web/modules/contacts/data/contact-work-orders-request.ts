"use client"

import type { WorkOrdersForContactPage } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const CONTACT_WORK_ORDERS_QUERY_KEY = ["contacts", "work-orders"] as const

type WorkOrdersPageResponse = {
  page: WorkOrdersForContactPage
}

/**
 * Paginated read of one contact's work orders + total labor cost (record-view
 * Statistics section).
 */
export async function contactWorkOrdersSectionRequest(
  contactId: string,
  skip: number,
  take: number,
  signal: AbortSignal | undefined,
): Promise<WorkOrdersForContactPage> {
  const params = new URLSearchParams()
  if (skip > 0) params.set("skip", String(skip))
  params.set("take", String(take))
  const result = await requestJson<WorkOrdersPageResponse>(
    `/api/contacts/${contactId}/work-orders?${params.toString()}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    },
  )
  return result.page
}
