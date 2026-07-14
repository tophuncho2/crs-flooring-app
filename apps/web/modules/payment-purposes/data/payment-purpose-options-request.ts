import type { PaymentPurposeOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const PAYMENT_PURPOSE_OPTIONS_QUERY_KEY = ["payment-purposes", "options"] as const

export type PaymentPurposeOptionsResponse = {
  options: PaymentPurposeOption[]
}

export type PaymentPurposeOptionsRequestArgs = {
  take?: number
}

export async function searchPaymentPurposeOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: PaymentPurposeOptionsRequestArgs = {},
): Promise<PaymentPurposeOption[]> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  params.set("take", String(args.take ?? 20))
  const url = `/api/payment-purposes/options?${params.toString()}`
  const result = await requestJson<PaymentPurposeOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
