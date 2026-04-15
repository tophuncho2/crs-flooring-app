"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import type { ServiceForm, ServiceRow } from "@builders/domain"

export async function createServiceRequest(input: ServiceForm) {
  return requestJson<{ service: ServiceRow }>("/api/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}

export async function updateServiceRequest(id: string, input: ServiceForm, revisionKey: string) {
  return requestJson<{ service: ServiceRow }>(`/api/services/${id}/primary/section`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input, revisionKey)),
  })
}

export async function deleteServiceRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/services/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}
