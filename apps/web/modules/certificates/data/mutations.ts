"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type {
  CertificateDetailRecord,
  CertificateFileRecord,
  CertificatePrimaryForm,
} from "@builders/domain"

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

// Multipart upload — no Content-Type header: the browser sets the multipart
// boundary. The idempotency key rides as a form field (the JSON envelope can't).
export async function uploadCertificateFileRequest(certificateId: string, file: File) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("idempotencyKey", crypto.randomUUID())
  return requestJson<{ file: CertificateFileRecord }>(
    `/api/certificates/${certificateId}/files`,
    { method: "POST", body: formData },
  )
}

export async function deleteCertificateFileRequest(certificateId: string, fileId: string) {
  return requestJson<{ ok: true }>(
    `/api/certificates/${certificateId}/files/${fileId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta({})),
    },
  )
}

export async function fetchCertificateFileDownloadUrl(certificateId: string, fileId: string) {
  return requestJson<{ url: string }>(
    `/api/certificates/${certificateId}/files/${fileId}/download`,
  )
}
