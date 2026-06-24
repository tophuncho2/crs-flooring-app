"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type { EntityDetail, EntityForm } from "@builders/domain"

export async function createEntityRequest(input: EntityForm) {
  return requestJson<{ entity: EntityDetail }>(
    "/api/entities",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(input)),
    },
  )
}

export async function updateEntityRequest(
  id: string,
  input: EntityForm,
  revisionKey: string,
) {
  return requestJson<{ entity: EntityDetail }>(
    `/api/entities/${id}/primary/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(input, revisionKey)),
    },
  )
}

export async function deleteEntityRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/entities/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}
