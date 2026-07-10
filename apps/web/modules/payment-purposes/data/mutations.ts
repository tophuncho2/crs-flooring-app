"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type { PaymentPurpose, PaymentPurposeForm } from "@builders/domain"

export async function createPaymentPurposeRequest(input: PaymentPurposeForm) {
  return requestJson<{ paymentPurpose: PaymentPurpose }>("/api/payment-purposes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}

export async function updatePaymentPurposeRequest(
  id: string,
  input: PaymentPurposeForm,
  revisionKey: string,
) {
  return requestJson<{ paymentPurpose: PaymentPurpose }>(
    `/api/payment-purposes/${id}/primary/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(input, revisionKey)),
    },
  )
}

export async function deletePaymentPurposeRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/payment-purposes/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}
