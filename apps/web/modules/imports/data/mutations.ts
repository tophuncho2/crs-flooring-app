"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import type { ImportRecord, ImportDetailRecord } from "@builders/db"
import type { CreateImportInput, UpdateImportInput } from "@builders/application"

export async function createImportRequest(input: CreateImportInput) {
  return requestJson<{ import: ImportRecord }>("/api/imports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}

export async function updateImportRequest(id: string, input: UpdateImportInput, revisionKey: string) {
  return requestJson<{ import: ImportRecord }>(`/api/imports/${id}/primary/section`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input, revisionKey)),
  })
}

export async function deleteImportRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/imports/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}

export type { ImportRecord, ImportDetailRecord }
