"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type { Payment, PaymentForm } from "@builders/domain"

/**
 * Create carries a STABLE `idempotencyKey` (held by the record controller per
 * submit intent) so a retried request replays instead of inserting a second
 * row — the fix for the known double-submit bug. Update/delete are guarded by
 * `expectedUpdatedAt` (optimistic-concurrency) and keep the default key.
 */
export async function createPaymentRequest(input: PaymentForm, idempotencyKey: string) {
  return requestJson<{ payment: Payment }>("/api/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({ ...input }, undefined, idempotencyKey)),
  })
}

export async function updatePaymentRequest(
  id: string,
  input: PaymentForm,
  expectedUpdatedAt: string,
) {
  return requestJson<{ payment: Payment }>(`/api/payments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({ ...input }, expectedUpdatedAt)),
  })
}

export async function deletePaymentRequest(id: string, expectedUpdatedAt: string) {
  return requestJson<{ ok: true }>(`/api/payments/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, expectedUpdatedAt)),
  })
}
