"use client"

import { requestJson } from "@/features/flooring/shared/transport/http"
import type { ServiceForm, ServiceRow } from "../domain/types"

export async function createServiceRequest(input: ServiceForm) {
  return requestJson<{ service: ServiceRow }>("/api/flooring/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function updateServiceRequest(id: string, input: ServiceForm) {
  return requestJson<{ service: ServiceRow }>(`/api/flooring/services/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function deleteServiceRequest(id: string) {
  return requestJson<{ ok: true }>(`/api/flooring/services/${id}`, {
    method: "DELETE",
  })
}
