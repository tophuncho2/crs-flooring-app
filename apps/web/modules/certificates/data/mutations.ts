"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type { CertificateDetailRecord, CertificatePrimaryForm } from "@builders/domain"

export async function createCertificateRequest(input: CertificatePrimaryForm) {
  return requestJson<{ certificate: CertificateDetailRecord }>("/api/certificates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}

export async function updateCertificateRequest(
  id: string,
  input: CertificatePrimaryForm,
  revisionKey: string,
) {
  return requestJson<{ certificate: CertificateDetailRecord }>(
    `/api/certificates/${id}/primary/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(input, revisionKey)),
    },
  )
}

export async function deleteCertificateRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/certificates/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}
