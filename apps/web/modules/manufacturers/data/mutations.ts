"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import type { ManufacturerForm, ManufacturerRow } from "../domain/types"

export async function createManufacturerRequest(input: ManufacturerForm) {
  return requestJson<{ manufacturer: ManufacturerRow }>("/api/manufacturers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function updateManufacturerRequest(id: string, input: ManufacturerForm) {
  return requestJson<{ manufacturer: ManufacturerRow }>(`/api/manufacturers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function deleteManufacturerRequest(id: string) {
  return requestJson<{ ok: true }>(`/api/manufacturers/${id}`, {
    method: "DELETE",
  })
}
