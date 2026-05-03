"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type { ManagementCompanyDetail, ManagementCompanyForm } from "@builders/domain"

export async function createManagementCompanyRequest(input: ManagementCompanyForm) {
  return requestJson<{ managementCompany: ManagementCompanyDetail }>("/api/management-companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}

export async function updateManagementCompanyRequest(
  id: string,
  input: ManagementCompanyForm,
  revisionKey: string,
) {
  return requestJson<{ managementCompany: ManagementCompanyDetail }>(
    `/api/management-companies/${id}/primary/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(input, revisionKey)),
    },
  )
}

export async function deleteManagementCompanyRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/management-companies/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}
