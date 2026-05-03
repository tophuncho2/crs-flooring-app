"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type { ManufacturerForm, ManufacturerRow } from "@builders/domain"

export async function createManufacturerRequest(input: ManufacturerForm) {
  return requestJson<{ manufacturer: ManufacturerRow }>("/api/manufacturers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}

export async function updateManufacturerRequest(id: string, input: ManufacturerForm, revisionKey: string) {
  return requestJson<{ manufacturer: ManufacturerRow }>(`/api/manufacturers/${id}/primary/section`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input, revisionKey)),
  })
}

export async function deleteManufacturerRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/manufacturers/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}
