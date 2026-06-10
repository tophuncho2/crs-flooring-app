"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type { PropertyDetailRecord, PropertyPrimaryForm } from "@builders/domain"

export async function updatePropertyRequest(
  id: string,
  input: PropertyPrimaryForm,
  revisionKey: string,
) {
  return requestJson<{ property: PropertyDetailRecord }>(
    `/api/properties/${id}/primary/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(input, revisionKey)),
    },
  )
}

export async function deletePropertyRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/properties/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}
