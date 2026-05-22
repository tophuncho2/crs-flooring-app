"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type { JobType, JobTypeForm } from "@builders/domain"

export async function createJobTypeRequest(input: JobTypeForm) {
  return requestJson<{ jobType: JobType }>("/api/job-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}

export async function updateJobTypeRequest(
  id: string,
  input: JobTypeForm,
  revisionKey: string,
) {
  return requestJson<{ jobType: JobType }>(
    `/api/job-types/${id}/primary/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(input, revisionKey)),
    },
  )
}

export async function deleteJobTypeRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/job-types/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}
