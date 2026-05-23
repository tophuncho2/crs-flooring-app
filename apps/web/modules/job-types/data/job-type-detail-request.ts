"use client"

import type { JobType } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const JOB_TYPE_DETAIL_QUERY_KEY = ["job-types", "detail"] as const

export async function getJobTypeDetailRequest(id: string): Promise<JobType> {
  const response = await requestJson<{ jobType: JobType }>(`/api/job-types/${id}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
  return response.jobType
}
