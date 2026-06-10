"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type { LaborPayment, LaborPaymentForm } from "@builders/domain"

/**
 * Labor-payment mutations called by the contact record view's labor-payments
 * section. Create/update carry `contactId` in the body (the contact is editable
 * in-section), so they hit the top-level labor-payment routes rather than a
 * contact-scoped child route.
 */
export async function createLaborPaymentRequest(input: LaborPaymentForm) {
  return requestJson<{ laborPayment: LaborPayment }>("/api/labor-payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}

export async function updateLaborPaymentRequest(
  id: string,
  input: LaborPaymentForm,
  revisionKey: string,
) {
  return requestJson<{ laborPayment: LaborPayment }>(
    `/api/labor-payments/${id}/primary/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(input, revisionKey)),
    },
  )
}

export async function deleteLaborPaymentRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/labor-payments/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}
