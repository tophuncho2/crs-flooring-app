"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import type { ServiceForm, ServiceRow } from "../domain/types"

export async function createServiceRequest(input: ServiceForm) {
  return requestJson<{ service: ServiceRow }>("/api/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function updateServiceRequest(id: string, input: ServiceForm) {
  return requestJson<{ service: ServiceRow }>(`/api/services/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function deleteServiceRequest(id: string) {
  return requestJson<{ ok: true }>(`/api/services/${id}`, {
    method: "DELETE",
  })
}
