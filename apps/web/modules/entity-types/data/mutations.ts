"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type { EntityType, EntityTypeForm } from "@builders/domain"

export async function createEntityTypeRequest(input: EntityTypeForm) {
  return requestJson<{ entityType: EntityType }>("/api/entity-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}

export async function updateEntityTypeRequest(
  id: string,
  input: EntityTypeForm,
  revisionKey: string,
) {
  return requestJson<{ entityType: EntityType }>(
    `/api/entity-types/${id}/primary/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(input, revisionKey)),
    },
  )
}

export async function deleteEntityTypeRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/entity-types/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}
